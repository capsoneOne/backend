'use server';

import {mutate, query} from '@/platform/vendure/api';
import {SetOrderShippingAddressMutation, SetOrderBillingAddressMutation, SetOrderShippingMethodMutation, AddPaymentToOrderMutation, TransitionOrderToStateMutation, SetCustomerForOrderMutation, GetActiveOrderForCheckoutQuery, GeneratePayWayQrMutation, PayWayPaymentStateQuery, CreatePayWayCardCheckoutMutation} from '@/features/checkout/graphql';
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

/**
 * The shapes the two PayWay operations select, declared here rather than inferred.
 *
 * gql.tada types documents against a schema introspected from a running server
 * (tsconfig's tadaOutputLocation), so anything added to the Shop API is `unknown`
 * until `next typegen` runs against a server with this build of the plugin loaded.
 * These match the SDL in the plugin's api-extensions.ts, and the generated types are
 * assignable to them once regenerated — so this compiles before the first typegen and
 * keeps its meaning after.
 */
interface PayWaySessionPayload {
    transactionId: string;
    qrImage: string;
    qrString: string;
    abaDeeplink: string | null;
    expiresAt: string;
    orderCode: string;
    sandbox: boolean;
}

interface PayWayStatePayload {
    status: string;
    settled: boolean;
    orderCode: string | null;
}

export type PayWayPaymentSession =
    | {
          success: true;
          transactionId: string;
          /**
           * ABA's branded KHQR artwork, as the base64 data URI PayWay returned. Kept
           * as a data URI on purpose: an <img> pointing at a remote copy would tell
           * whoever serves it that this order is being paid, on every render.
           */
          qrImage: string;
          /** Opens ABA Mobile directly, for a customer paying on the same phone. */
          abaDeeplink: string | null;
          expiresAt: string;
          orderCode: string;
          /** Sandbox QRs carry a placeholder merchant account and cannot be paid. */
          sandbox: boolean;
      }
    | {success: false; message: string};

export async function generatePayWayQr(): Promise<PayWayPaymentSession> {
    try {
        await transitionToArrangingPayment();

        const result = await mutate(GeneratePayWayQrMutation, {}, {useAuthToken: true});
        const session = result.data.generatePayWayQr as PayWaySessionPayload;

        return {
            success: true,
            transactionId: session.transactionId,
            qrImage: session.qrImage,
            abaDeeplink: session.abaDeeplink,
            expiresAt: session.expiresAt,
            orderCode: session.orderCode,
            sandbox: session.sandbox,
        };
    } catch (error) {
        console.error('Failed to generate PayWay QR', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Could not start the KHQR payment',
        };
    }
}

export interface PayWayPollResult {
    status: 'APPROVED' | 'PRE-AUTH' | 'PENDING' | 'DECLINED' | 'REFUNDED' | 'CANCELLED' | 'UNKNOWN';
    settled: boolean;
    orderCode: string | null;
}

/**
 * Asks the server where the transaction stands. The server is the one talking to
 * PayWay and the one that settles the order, so nothing the browser reports here is
 * trusted — this only prompts the check and relays the answer back to the UI.
 */
export async function pollPayWayPayment(transactionId: string): Promise<PayWayPollResult> {
    try {
        const result = await query(
            PayWayPaymentStateQuery,
            {transactionId},
            {useAuthToken: true, fetch: {cache: 'no-store'}},
        );
        const state = result.data.payWayPaymentState as PayWayStatePayload;

        if (state.settled) {
            updateTag('cart');
            updateTag('active-order');
        }

        return {
            status: state.status as PayWayPollResult['status'],
            settled: state.settled,
            orderCode: state.orderCode ?? null,
        };
    } catch (error) {
        // A failed poll is a network blip, not a failed payment. Reporting it as
        // terminal would abandon a QR the customer may be paying right now.
        console.error('Failed to poll PayWay payment', error);
        return {status: 'UNKNOWN', settled: false, orderCode: null};
    }
}

interface PayWayCardPayload {
    transactionId: string;
    actionUrl: string;
    fields: Array<{name: string; value: string}>;
    orderCode: string;
}

export type PayWayCardCheckout =
    | {
          success: true;
          transactionId: string;
          /** PayWay's purchase endpoint — the form's action. */
          actionUrl: string;
          /**
           * Pre-signed hidden fields. The signing key stays on the server; the browser
           * only carries the result across, as PayWay's own integration does.
           */
          fields: Array<{name: string; value: string}>;
          orderCode: string;
      }
    | {success: false; message: string};

export async function createPayWayCardCheckout(): Promise<PayWayCardCheckout> {
    try {
        await transitionToArrangingPayment();

        const result = await mutate(CreatePayWayCardCheckoutMutation, {}, {useAuthToken: true});
        const checkout = result.data.createPayWayCardCheckout as PayWayCardPayload;

        return {
            success: true,
            transactionId: checkout.transactionId,
            actionUrl: checkout.actionUrl,
            fields: checkout.fields,
            orderCode: checkout.orderCode,
        };
    } catch (error) {
        console.error('Failed to prepare PayWay card checkout', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Could not start the card payment',
        };
    }
}
