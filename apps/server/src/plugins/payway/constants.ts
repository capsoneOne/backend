export const PAYWAY_PLUGIN_OPTIONS = Symbol('PAYWAY_PLUGIN_OPTIONS');

export const loggerCtx = 'PayWayPlugin';

/**
 * The handler code. One handler serves both payment methods below: from the moment
 * PayWay reports APPROVED the two are identical — same check-transaction call, same
 * verification, same settlement — and they differ only in how the payer was asked.
 */
export const PAYWAY_HANDLER_CODE = 'payway';

/**
 * PaymentMethod codes created in the Admin UI. These are what the storefront selects
 * on and what `addPaymentToOrder` names; both point at the handler above.
 */
export const PAYWAY_KHQR_METHOD_CODE = 'payway-khqr';
export const PAYWAY_CARD_METHOD_CODE = 'payway-card';

export const PAYWAY_SANDBOX_URL = 'https://checkout-sandbox.payway.com.kh';
export const PAYWAY_PRODUCTION_URL = 'https://checkout.payway.com.kh';

export const GENERATE_QR_PATH = '/api/payment-gateway/v1/payments/generate-qr';
export const PURCHASE_PATH = '/api/payment-gateway/v1/payments/purchase';
export const CHECK_TRANSACTION_PATH = '/api/payment-gateway/v1/payments/check-transaction-2';

/** Route the callback controller listens on: POST /payments/payway. */
export const PAYWAY_CALLBACK_ROUTE = '/payments/payway';

/**
 * PayWay's minimum is 0.01 USD / 100 KHR. Only USD is accepted here — see
 * PayWayService.generateQr for why KHR is refused rather than converted.
 */
export const PAYWAY_CURRENCY = 'USD';

/**
 * QR lifetime in minutes. PayWay allows 3 minutes to 30 days; fifteen is long enough
 * to find your phone and open a banking app, short enough that an abandoned checkout
 * does not leave a payable QR lying around.
 */
export const QR_LIFETIME_MINUTES = 15;

/** Branded KHQR artwork. PayWay returns it as a base64 data URI in `qrImage`. */
export const QR_IMAGE_TEMPLATE = 'template3_color';

/** `payment_status` values that mean the money arrived. */
export const APPROVED_STATUS = 'APPROVED';
