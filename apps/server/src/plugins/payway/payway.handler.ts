import {
    CreatePaymentResult,
    Injector,
    LanguageCode,
    PaymentMethodHandler,
    SettlePaymentResult,
} from '@vendure/core';

import { APPROVED_STATUS, PAYWAY_CURRENCY, PAYWAY_HANDLER_CODE } from './constants';
import { PayWayService } from './payway.service';

let injector: Injector;

/**
 * Settles an order against an ABA PayWay transaction, whether the payer scanned a
 * KHQR or paid by card on PayWay's hosted page.
 *
 * Never driven by the customer's browser. It runs from the poll or the callback, and
 * the only thing it is handed is a transaction id — treated as a claim to check, not
 * evidence. It calls check-transaction itself and rejects anything whose status,
 * amount or currency does not line up, so forging a settlement means forging
 * PayWay's own API response.
 *
 * No Authorized step: this integration requests `purchase`, never `pre-auth`, so a
 * transaction is either APPROVED or it is not money.
 */
export const paywayPaymentHandler = new PaymentMethodHandler({
    code: PAYWAY_HANDLER_CODE,
    description: [{ languageCode: LanguageCode.en, value: 'ABA PayWay (KHQR and card)' }],
    args: {},

    init(_injector) {
        injector = _injector;
    },

    async createPayment(ctx, order, amount, _args, metadata): Promise<CreatePaymentResult> {
        const transactionId = metadata?.paywayTransactionId as string | undefined;
        if (!transactionId) {
            return {
                amount,
                state: 'Declined' as const,
                errorMessage: 'Missing PayWay transaction id',
                metadata: {},
            };
        }

        const payway = injector.get(PayWayService);
        const response = await payway.checkTransaction(transactionId);
        const data = response.data;

        if (!data || data.payment_status !== APPROVED_STATUS) {
            return {
                amount,
                state: 'Declined' as const,
                errorMessage: `PayWay transaction is ${data?.payment_status ?? 'not found'}, not approved`,
                metadata: { paywayTransactionId: transactionId },
            };
        }

        // Compared in minor units so PayWay's float never has to round the way this
        // side rounds. payment_amount is what the customer actually paid, which is not
        // necessarily what they were asked for.
        const paidMinorUnits = Math.round(data.payment_amount * 100);
        if (data.payment_currency !== PAYWAY_CURRENCY || paidMinorUnits !== amount) {
            return {
                amount,
                state: 'Declined' as const,
                errorMessage: `PayWay transaction paid ${data.payment_amount} ${data.payment_currency}, expected ${(
                    amount / 100
                ).toFixed(2)} ${PAYWAY_CURRENCY}`,
                metadata: { paywayTransactionId: transactionId },
            };
        }

        return {
            amount,
            state: 'Settled' as const,
            transactionId,
            metadata: {
                paywayTransactionId: transactionId,
                method: 'ABA PayWay',
                // The approval code is what ABA support asks for when tracing a payment.
                approvalCode: data.apv,
                transactionDate: data.transaction_date,
            },
        };
    },

    /** Never reached normally — createPayment already returns Settled. */
    async settlePayment(): Promise<SettlePaymentResult> {
        return { success: true };
    },
});
