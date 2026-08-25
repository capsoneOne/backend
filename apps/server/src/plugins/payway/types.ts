export interface PayWayPluginOptions {
    /** Merchant id issued by ABA. Absent means the plugin loads and does nothing. */
    merchantId?: string;
    /** API key issued by ABA, used as the HMAC-SHA512 key for every request hash. */
    apiKey?: string;
    /**
     * Which PayWay environment to talk to. Sandbox is the default on purpose: a
     * misconfigured deploy should fail to take money rather than take it by accident.
     */
    environment: 'sandbox' | 'production';
    /**
     * Overrides the base URL for the chosen environment. ABA issues the API URL with
     * the credentials and it does not always match the documented host, so the
     * environment picks a default and this replaces it when they differ.
     */
    apiUrl?: string;
    /**
     * Publicly reachable base URL for the payment callback. Optional — the storefront
     * polls check-transaction, so settlement does not depend on it.
     */
    callbackBaseUrl?: string;
    requestTimeoutMs: number;
}

/** Response from POST /payments/generate-qr. */
export interface PayWayQrResponse {
    status: { code: string; message: string; trace_id?: string };
    amount?: number;
    currency?: string;
    qrString?: string;
    /** Base64 data URI of the branded KHQR image. */
    qrImage?: string;
    /** Opens ABA Mobile directly, for a customer paying on the same phone. */
    abapay_deeplink?: string;
}

/**
 * `payment_status` from check-transaction-2. APPROVED is the only one that means the
 * money arrived; PRE-AUTH is a hold, which this integration never requests.
 */
export type PayWayPaymentStatus =
    | 'APPROVED'
    | 'PRE-AUTH'
    | 'PENDING'
    | 'DECLINED'
    | 'REFUNDED'
    | 'CANCELLED';

/** Response from POST /payments/check-transaction-2. */
export interface PayWayCheckResponse {
    data?: {
        payment_status_code: number;
        payment_status: PayWayPaymentStatus;
        total_amount: number;
        original_amount: number;
        payment_amount: number;
        /** Empty string while PENDING — no payment has been made yet. */
        payment_currency: string;
        apv: string;
        transaction_date: string;
    };
    status: { code: string | number; message: string; tran_id?: string };
}

/** What the storefront needs to render the QR and start polling. */
export interface PayWayCheckoutSession {
    transactionId: string;
    /** Base64 data URI — embedded directly, so no request leaves the browser for it. */
    qrImage: string;
    qrString: string;
    abaDeeplink: string | null;
    expiresAt: string;
    orderCode: string;
    /**
     * True when the QR came from PayWay's sandbox. Sandbox QRs carry a placeholder
     * merchant account, so a real banking app cannot pay them — the storefront says
     * so rather than leaving the payer to find out by scanning.
     */
    sandbox: boolean;
}

/** One hidden field in the form the storefront posts to PayWay's hosted checkout. */
export interface PayWayFormField {
    name: string;
    value: string;
}

/**
 * Everything needed to hand the payer to PayWay's hosted card page. The signing key
 * never leaves the server: it produces the signed field set, and the browser only
 * carries it across.
 */
export interface PayWayCardCheckout {
    transactionId: string;
    /** PayWay's purchase endpoint — the form's action. */
    actionUrl: string;
    fields: PayWayFormField[];
    orderCode: string;
}

/** Result of polling. */
export interface PayWayPaymentState {
    status: PayWayPaymentStatus | 'UNKNOWN';
    /** True once the Vendure order has settled, not merely once PayWay says APPROVED. */
    settled: boolean;
    orderCode: string | null;
}
