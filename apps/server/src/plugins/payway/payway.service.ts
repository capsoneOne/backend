import { Inject, Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import {
    Logger,
    Order,
    OrderService,
    RequestContext,
    RequestContextService,
    TransactionalConnection,
} from '@vendure/core';

import {
    APPROVED_STATUS,
    CHECK_TRANSACTION_PATH,
    GENERATE_QR_PATH,
    PAYWAY_CALLBACK_ROUTE,
    PAYWAY_CURRENCY,
    PAYWAY_CARD_METHOD_CODE,
    PAYWAY_KHQR_METHOD_CODE,
    PAYWAY_PLUGIN_OPTIONS,
    PAYWAY_PRODUCTION_URL,
    PAYWAY_SANDBOX_URL,
    PURCHASE_PATH,
    QR_IMAGE_TEMPLATE,
    QR_LIFETIME_MINUTES,
    loggerCtx,
} from './constants';
import {
    PayWayCardCheckout,
    PayWayCheckResponse,
    PayWayCheckoutSession,
    PayWayPaymentState,
    PayWayPluginOptions,
    PayWayQrResponse,
} from './types';

/** A QR we handed out, kept only long enough to stop a double-click making two. */
interface ActiveSession {
    transactionId: string;
    qrImage: string;
    qrString: string;
    abaDeeplink: string | null;
    expiresAt: string;
    attempt: number;
    /** Which PaymentMethod code this transaction was started from. */
    methodCode: string;
}

/** PayWay caps tran_id at 20 characters. */
const MAX_TRAN_ID_LENGTH = 20;

@Injectable()
export class PayWayService {
    private readonly sessions = new Map<string, ActiveSession>();

    constructor(
        @Inject(PAYWAY_PLUGIN_OPTIONS) private options: PayWayPluginOptions,
        private orderService: OrderService,
        private requestContextService: RequestContextService,
        private connection: TransactionalConnection,
    ) {}

    get isConfigured(): boolean {
        return Boolean(this.options.merchantId && this.options.apiKey);
    }

    get isSandbox(): boolean {
        return this.options.environment !== 'production';
    }

    private get baseUrl(): string {
        if (this.options.apiUrl) {
            // ABA's credentials email quotes the full purchase endpoint rather than a
            // host, so an operator pasting it verbatim is the expected case and not a
            // mistake — trim any API path back to the origin, and drop a trailing
            // slash, which PayWay's router treats as a different route.
            return this.options.apiUrl.replace(/\/api\/.*$/, '').replace(/\/+$/, '');
        }
        return this.options.environment === 'production' ? PAYWAY_PRODUCTION_URL : PAYWAY_SANDBOX_URL;
    }

    // --- checkout ------------------------------------------------------------

    /**
     * Asks PayWay for a KHQR for this order. The order is not touched: no Vendure
     * Payment exists until the money actually arrives, because a QR is an invitation
     * to pay and not a payment.
     */
    async generateQr(_ctx: RequestContext, order: Order): Promise<PayWayCheckoutSession> {
        if (!this.isConfigured) {
            throw new Error('PayWay is not configured');
        }
        if (order.currencyCode !== PAYWAY_CURRENCY) {
            // PayWay also settles KHR, but Vendure holds every currency in minor units
            // while KHR is conventionally quoted without decimals. Getting that wrong
            // misprices an order by 100x in the direction of the customer's favour,
            // so KHR is refused until it is deliberately implemented and tested.
            throw new Error(
                `PayWay is configured for ${PAYWAY_CURRENCY}; order ${order.code} is in ${order.currencyCode}`,
            );
        }

        const existing = this.sessions.get(order.code);
        if (existing && Date.parse(existing.expiresAt) > Date.now()) {
            const state = await this.checkTransaction(existing.transactionId);
            if (state.data?.payment_status === 'PENDING') {
                return { ...existing, orderCode: order.code, sandbox: this.isSandbox };
            }
        }

        const attempt = (existing?.attempt ?? 0) + 1;
        const tranId = this.buildTranId(order.code, attempt);
        // Vendure holds minor units; PayWay wants a formatted decimal string, and the
        // string that goes in the hash has to be byte-identical to the one sent.
        const amount = (order.totalWithTax / 100).toFixed(2);

        const callbackUrl = this.options.callbackBaseUrl
            ? Buffer.from(`${this.options.callbackBaseUrl.replace(/\/$/, '')}${PAYWAY_CALLBACK_ROUTE}`).toString('base64')
            : '';
        const reqTime = this.requestTime();

        const payload = {
            req_time: reqTime,
            merchant_id: this.options.merchantId!,
            tran_id: tranId,
            amount,
            currency: PAYWAY_CURRENCY,
            payment_option: 'abapay_khqr',
            lifetime: QR_LIFETIME_MINUTES,
            qr_image_template: QR_IMAGE_TEMPLATE,
            ...(callbackUrl ? { callback_url: callbackUrl } : {}),
        };

        // Concatenation order is fixed by PayWay and differs from the documented
        // parameter table; every field we do not send contributes an empty string.
        const hash = this.sign(
            [
                reqTime,
                this.options.merchantId!,
                tranId,
                amount,
                '', // items
                '', // first_name
                '', // last_name
                '', // email
                '', // phone
                '', // purchase_type
                'abapay_khqr',
                callbackUrl,
                '', // return_deeplink
                PAYWAY_CURRENCY,
                '', // custom_fields
                '', // return_params
                '', // payout
                String(QR_LIFETIME_MINUTES),
                QR_IMAGE_TEMPLATE,
            ].join(''),
        );

        const response = await this.post<PayWayQrResponse>(GENERATE_QR_PATH, { ...payload, hash });

        if (String(response.status.code) !== '0' || !response.qrImage) {
            throw new Error(
                `PayWay refused the QR request (${response.status.code}): ${response.status.message}`,
            );
        }

        const session: ActiveSession = {
            transactionId: tranId,
            qrImage: response.qrImage,
            qrString: response.qrString ?? '',
            abaDeeplink: response.abapay_deeplink ?? null,
            expiresAt: new Date(Date.now() + QR_LIFETIME_MINUTES * 60_000).toISOString(),
            attempt,
            methodCode: PAYWAY_KHQR_METHOD_CODE,
        };
        this.sessions.set(order.code, session);
        Logger.verbose(`Generated PayWay KHQR ${tranId} for order ${order.code}`, loggerCtx);

        return { ...session, orderCode: order.code, sandbox: this.isSandbox };
    }

    /**
     * Builds the signed field set for PayWay's hosted card page.
     *
     * The purchase endpoint answers with an HTML checkout page rather than a URL, so
     * it has to be reached by a form POST from the payer's browser. The signing key
     * never goes with it: this produces the signed fields server-side and the browser
     * only carries them across, exactly as the documented integration does.
     *
     * No return_url is set. The storefront polls check-transaction while the payer is
     * on PayWay's page, which is the same path KHQR already uses — so settlement does
     * not depend on the payer making it back to a redirect, which is the step most
     * likely to be lost to a closed tab.
     */
    async createCardCheckout(_ctx: RequestContext, order: Order): Promise<PayWayCardCheckout> {
        if (!this.isConfigured) {
            throw new Error('PayWay is not configured');
        }
        if (order.currencyCode !== PAYWAY_CURRENCY) {
            throw new Error(
                `PayWay is configured for ${PAYWAY_CURRENCY}; order ${order.code} is in ${order.currencyCode}`,
            );
        }

        const existing = this.sessions.get(order.code);
        const attempt = (existing?.attempt ?? 0) + 1;
        const tranId = this.buildTranId(order.code, attempt);
        const amount = (order.totalWithTax / 100).toFixed(2);
        const reqTime = this.requestTime();
        const type = 'purchase';
        const paymentOption = 'cards';
        const lifetime = String(QR_LIFETIME_MINUTES);

        // Concatenation order is fixed by PayWay and differs from the documented
        // parameter table; every field we do not send contributes an empty string.
        // view_type and payment_gate are excluded from the hash by specification.
        const hash = this.sign(
            [
                reqTime,
                this.options.merchantId!,
                tranId,
                amount,
                '', // items
                '', // shipping
                '', // firstname
                '', // lastname
                '', // email
                '', // phone
                type,
                paymentOption,
                '', // return_url
                '', // cancel_url
                '', // continue_success_url
                '', // return_deeplink
                PAYWAY_CURRENCY,
                '', // custom_fields
                '', // return_params
                '', // payout
                lifetime,
                '', // additional_params
                '', // google_pay_token
                '', // skip_success_page
            ].join(''),
        );

        this.sessions.set(order.code, {
            transactionId: tranId,
            qrImage: '',
            qrString: '',
            abaDeeplink: null,
            expiresAt: new Date(Date.now() + QR_LIFETIME_MINUTES * 60_000).toISOString(),
            attempt,
            methodCode: PAYWAY_CARD_METHOD_CODE,
        });
        Logger.verbose(`Prepared PayWay card checkout ${tranId} for order ${order.code}`, loggerCtx);

        return {
            transactionId: tranId,
            actionUrl: `${this.baseUrl}${PURCHASE_PATH}`,
            fields: [
                { name: 'req_time', value: reqTime },
                { name: 'merchant_id', value: this.options.merchantId! },
                { name: 'tran_id', value: tranId },
                { name: 'amount', value: amount },
                { name: 'currency', value: PAYWAY_CURRENCY },
                { name: 'type', value: type },
                { name: 'payment_option', value: paymentOption },
                { name: 'lifetime', value: lifetime },
                // Our profile also has the QR API enabled; 0 selects the Checkout
                // service, without which the purchase endpoint refuses the request.
                { name: 'payment_gate', value: '0' },
                { name: 'view_type', value: 'hosted_view' },
                { name: 'hash', value: hash },
            ],
            orderCode: order.code,
        };
    }

    /**
     * Reconciles one PayWay transaction against the order.
     *
     * Both the storefront poll and the callback land here. The callback carries no
     * signature — PayWay documents no HMAC on it — so it is treated purely as a hint
     * that something changed, and the answer always comes from check-transaction.
     * Settlement is idempotent, so both arriving is fine.
     */
    async syncPayment(transactionId: string): Promise<PayWayPaymentState> {
        const orderCode = this.orderCodeFrom(transactionId);
        const response = await this.checkTransaction(transactionId);

        const status = response.data?.payment_status;
        if (!status) {
            // Code 6 is "transaction not found", which for a QR we just issued means
            // PayWay has not registered it yet rather than that anything is wrong.
            return { status: 'UNKNOWN', settled: false, orderCode };
        }
        if (status !== APPROVED_STATUS) {
            return { status, settled: false, orderCode };
        }

        const settled = await this.settleOrder(orderCode, transactionId);
        return { status, settled, orderCode };
    }

    private async settleOrder(orderCode: string, transactionId: string): Promise<boolean> {
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const order = await this.orderService.findOneByCode(ctx, orderCode);

        if (!order) {
            Logger.warn(`PayWay transaction ${transactionId} references unknown order ${orderCode}`, loggerCtx);
            return false;
        }
        if (order.state !== 'ArrangingPayment') {
            // The other path got here first, or the order was completed by hand.
            return order.state !== 'AddingItems';
        }

        // Which of the two PayWay methods was used is only knowable from the session
        // that issued the transaction. A restart loses that, and KHQR is the safer
        // default: both settle identically and the code is a label on the payment.
        const methodCode = this.sessions.get(orderCode)?.methodCode ?? PAYWAY_KHQR_METHOD_CODE;

        // addPaymentToOrder writes the payment and advances the order state together,
        // so Vendure requires a transaction around it. Resolvers get one from
        // @Transaction(), but settlement is also reached from the webhook controller,
        // which is outside any resolver — so the transaction is opened here and both
        // callers are covered.
        const result = await this.connection.withTransaction(ctx, transactionCtx =>
            this.orderService.addPaymentToOrder(transactionCtx, order.id, {
                method: methodCode,
                // The handler re-checks the transaction itself, so this is a reference
                // and not proof of anything.
                metadata: { paywayTransactionId: transactionId },
            }),
        );

        if (!(result instanceof Order)) {
            Logger.error(
                `Failed to settle order ${orderCode} from PayWay ${transactionId}: ${result.message}`,
                loggerCtx,
            );
            return false;
        }

        Logger.info(`Settled order ${orderCode} from PayWay transaction ${transactionId}`, loggerCtx);
        this.sessions.delete(orderCode);
        return true;
    }

    // --- PayWay API ----------------------------------------------------------

    async checkTransaction(transactionId: string): Promise<PayWayCheckResponse> {
        if (!this.isConfigured) {
            throw new Error('PayWay is not configured');
        }
        const reqTime = this.requestTime();
        // The prose documents this hash as merchant_id + tran_id, while the reference
        // implementation alongside it prepends req_time. The sample is what PayWay
        // actually verifies against.
        const hash = this.sign(`${reqTime}${this.options.merchantId}${transactionId}`);

        return this.post<PayWayCheckResponse>(CHECK_TRANSACTION_PATH, {
            req_time: reqTime,
            merchant_id: this.options.merchantId,
            tran_id: transactionId,
            hash,
        });
    }

    private sign(value: string): string {
        return createHmac('sha512', this.options.apiKey!).update(value).digest('base64');
    }

    /** PayWay wants UTC `YYYYMMDDHHmmss`. */
    private requestTime(): string {
        return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    }

    /**
     * PayWay rejects a repeated tran_id outright (status 403), so a retry after an
     * expired QR needs a fresh one. The order code stays the prefix so the id remains
     * traceable, and the suffix is stripped to recover it.
     */
    private buildTranId(orderCode: string, attempt: number): string {
        if (attempt === 1) return orderCode.slice(0, MAX_TRAN_ID_LENGTH);
        const suffix = `-${attempt}`;
        return `${orderCode.slice(0, MAX_TRAN_ID_LENGTH - suffix.length)}${suffix}`;
    }

    private orderCodeFrom(transactionId: string): string {
        return transactionId.replace(/-\d+$/, '');
    }

    private async post<T>(path: string, body: unknown): Promise<T> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.options.requestTimeoutMs);

        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(`PayWay ${path} ${response.status}: ${text.slice(0, 200)}`);
            }
            return (await response.json()) as T;
        } finally {
            clearTimeout(timer);
        }
    }
}
