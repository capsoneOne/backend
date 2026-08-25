import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Logger } from '@vendure/core';

import { loggerCtx } from '../constants';
import { PayWayService } from '../payway.service';

/** What PayWay posts to the callback. Only the transaction id is acted upon. */
interface PayWayCallbackBody {
    tran_id?: string;
    transaction_id?: string;
    merchant_ref?: string;
    status?: number;
    payment_status?: string;
}

/**
 * PayWay payment callback.
 *
 *     POST /payments/payway
 *
 * PayWay documents no signature on this callback — there is no HMAC header to check,
 * so anyone who learns the URL can post to it. It is therefore treated as a hint that
 * something changed and nothing more: the body's claim of status and amount is
 * discarded, and the transaction id is re-checked against PayWay's own
 * check-transaction API before anything is written. A forged callback can at worst
 * make the server ask PayWay a question it would have asked a few seconds later.
 *
 * This route sits outside `shopApiPath`, so no session middleware runs.
 */
@Controller('payments')
export class PayWayController {
    constructor(private payway: PayWayService) {}

    @Post('payway')
    @HttpCode(200)
    async handleCallback(@Body() body: PayWayCallbackBody): Promise<{ received: boolean }> {
        // merchant_ref carries the value from QR subtag 62.01, which is our tran_id;
        // the field name varies between the QR callback and the merchant webhook.
        const transactionId = body?.tran_id ?? body?.merchant_ref ?? body?.transaction_id;

        if (!transactionId) {
            Logger.warn('PayWay callback arrived without a transaction id', loggerCtx);
            return { received: false };
        }

        try {
            await this.payway.syncPayment(transactionId);
        } catch (error) {
            // Non-2xx makes PayWay retry, which is wanted when our database or theirs
            // is briefly down.
            Logger.error(
                `PayWay callback for ${transactionId} failed: ${
                    error instanceof Error ? error.message : String(error)
                }`,
                loggerCtx,
            );
            throw error;
        }

        return { received: true };
    }
}
