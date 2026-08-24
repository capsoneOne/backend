'use server';

import {mutate, query} from '@/platform/vendure/api';
import {SetOrderShippingAddressMutation, SetOrderBillingAddressMutation, SetOrderShippingMethodMutation, AddPaymentToOrderMutation, TransitionOrderToStateMutation, SetCustomerForOrderMutation, CreateStripePaymentIntentMutation, GetActiveOrderForCheckoutQuery} from '@/features/checkout/graphql';
import {CreateCustomerAddressMutation} from '@/features/account/graphql';
import {revalidatePath, updateTag} from 'next/cache';
import {redirect} from '@/platform/i18n/navigation';
import {getLocale} from 'next-intl/server';

interface AddressInput {
    fullName: string;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    province: string;
    postalCode: string;
    countryCode: string;
    phoneNumber: string;
    company?: string;
}

export async function setShippingAddress(
    shippingAddress: AddressInput,
    useSameForBilling: boolean
) {
    const shippingResult = await mutate(
        SetOrderShippingAddressMutation,
        {input: shippingAddress},
        {useAuthToken: true}
    );

    if (shippingResult.data.setOrderShippingAddress.__typename !== 'Order') {
        throw new Error('Failed to set shipping address');
    }

    if (useSameForBilling) {
        await mutate(
            SetOrderBillingAddressMutation,
            {input: shippingAddress},
            {useAuthToken: true}
        );
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

export async function setShippingMethod(shippingMethodId: string) {
    const result = await mutate(
        SetOrderShippingMethodMutation,
        {shippingMethodId: [shippingMethodId]},
        {useAuthToken: true}
    );

    if (result.data.setOrderShippingMethod.__typename !== 'Order') {
        throw new Error('Failed to set shipping method');
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

export async function createCustomerAddress(address: AddressInput) {
    const result = await mutate(
        CreateCustomerAddressMutation,
        {input: address},
        {useAuthToken: true}
    );

    if (!result.data.createCustomerAddress) {
        throw new Error('Failed to create customer address');
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
    return result.data.createCustomerAddress;
}

export async function transitionToArrangingPayment() {
    const result = await mutate(
        TransitionOrderToStateMutation,
        {state: 'ArrangingPayment'},
        {useAuthToken: true}
    );

    if (result.data.transitionOrderToState?.__typename === 'OrderStateTransitionError') {
        const errorResult = result.data.transitionOrderToState;

        // Being there already is not a failure. A declined card leaves the order in
        // ArrangingPayment, so every retry asks for a transition it has already made
        // — and treating that as fatal is what made a second card impossible.
        const {data} = await query(GetActiveOrderForCheckoutQuery, {}, {useAuthToken: true});
        if (data.activeOrder?.state !== 'ArrangingPayment') {
            throw new Error(
                `Failed to transition order state: ${errorResult.errorCode} - ${errorResult.message}`
            );
        }
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

/**
 * What the browser reports after validating a card locally.
 *
 * Note what is absent: the card number. A real gateway's client library tokenises
 * in the browser precisely so the number never reaches the merchant's server, and
 * the demo keeps that boundary — there is no reason for a simulated flow to handle
 * a PAN when the real one would not.
 */
export interface DemoCardPayment {
    outcome: 'approved' | 'declined';
    brand: string;
    last4: string;
}

export type PlaceOrderResult = { success: false; errorCode: string; message: string };

export async function placeOrder(
    paymentMethodCode: string,
    card?: DemoCardPayment,
): Promise<PlaceOrderResult | void> {
    // First, transition the order to ArrangingPayment state
    await transitionToArrangingPayment();

    // Prepare metadata based on payment method
    const metadata: Record<string, unknown> = {};

    // For standard payment, include the required fields
    if (paymentMethodCode === 'standard-payment') {
        metadata.shouldDecline = card?.outcome === 'declined';
        metadata.shouldError = false;
        metadata.shouldErrorOnSettle = false;
        if (card) {
            // Recorded so the admin sees which card was presented, in the same
            // shape a real gateway reports it: brand and last four, nothing more.
            metadata.simulated = true;
            metadata.cardBrand = card.brand;
            metadata.cardLast4 = card.last4;
        }
    }

    // Add payment to the order
    const result = await mutate(
        AddPaymentToOrderMutation,
        {
            input: {
                method: paymentMethodCode,
                metadata,
            },
        },
        {useAuthToken: true}
    );

    if (result.data.addPaymentToOrder.__typename !== 'Order') {
        const errorResult = result.data.addPaymentToOrder;
        // A declined card is an expected outcome, not a crash. Returning it lets the
        // form say so and keeps the order in ArrangingPayment so another card can be
        // tried, which is what throwing here used to prevent.
        return {
            success: false,
            errorCode: errorResult.errorCode,
            message: errorResult.message,
        };
    }

    const orderCode = result.data.addPaymentToOrder.code;

    // Update the cart tag to immediately invalidate cached cart data
    updateTag('cart');
    updateTag('active-order');

    const locale = await getLocale();
    redirect({href: `/order-confirmation/${orderCode}`, locale});
}

export type PrepareStripePaymentResult =
    | {success: true; clientSecret: string; orderCode: string}
    | {success: false};

export async function prepareStripePayment(): Promise<PrepareStripePaymentResult> {
    try {
        const [intentResult, orderResult] = await Promise.all([
            mutate(CreateStripePaymentIntentMutation, {}, {useAuthToken: true}),
            query(GetActiveOrderForCheckoutQuery, {}, {useAuthToken: true}),
        ]);
        const order = orderResult.data.activeOrder;
        if (!order) {
            return {success: false};
        }

        return {
            success: true,
            clientSecret: intentResult.data.createStripePaymentIntent,
            orderCode: order.code,
        };
    } catch (error) {
        console.error('Failed to prepare Stripe payment', error);
        return {
            success: false,
        };
    }
}

interface GuestCustomerInput {
    emailAddress: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

export type SetCustomerForOrderResult =
    | { success: true }
    | { success: false; errorCode: 'EMAIL_CONFLICT'; message: string }
    | { success: false; errorCode: 'GUEST_CHECKOUT_DISABLED'; message: string }
    | { success: false; errorCode: 'NO_ACTIVE_ORDER'; message: string }
    | { success: false; errorCode: 'UNKNOWN'; message: string };

export async function setCustomerForOrder(
    input: GuestCustomerInput
): Promise<SetCustomerForOrderResult> {
    const result = await mutate(
        SetCustomerForOrderMutation,
        { input },
        { useAuthToken: true }
    );

    const response = result.data.setCustomerForOrder;

    switch (response.__typename) {
        case 'Order': {
            const locale = await getLocale();
            revalidatePath(`/${locale}/checkout`);
            return { success: true };
        }
        case 'AlreadyLoggedInError':
            return { success: true };
        case 'EmailAddressConflictError':
            return { success: false, errorCode: 'EMAIL_CONFLICT', message: response.message };
        case 'GuestCheckoutError':
            return { success: false, errorCode: 'GUEST_CHECKOUT_DISABLED', message: response.message };
        case 'NoActiveOrderError':
            return { success: false, errorCode: 'NO_ACTIVE_ORDER', message: response.message };
        default:
            return { success: false, errorCode: 'UNKNOWN', message: 'Unknown error' };
    }
}
