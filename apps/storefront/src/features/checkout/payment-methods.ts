/**
 * The simulated card handler. Its code is historical — it is Vendure's
 * dummy-payment-handler, configured through the Dashboard — so the constant exists to
 * stop that string being spelled out at each call site.
 */
export const DEMO_CARD_PAYMENT_METHOD_CODE = 'standard-payment';

/**
 * ABA KHQR, via PayWay. The code is matched
 * against the PaymentMethod created in the Admin UI and against
 * PAYWAY_PAYMENT_METHOD_CODE on the server.
 */
export const PAYWAY_PAYMENT_METHOD_CODE = 'payway-khqr';

/**
 * Card payment through PayWay's hosted checkout. Shares the server-side handler with
 * KHQR — from PayWay's APPROVED onward the two settle identically.
 */
export const PAYWAY_CARD_PAYMENT_METHOD_CODE = 'payway-card';
