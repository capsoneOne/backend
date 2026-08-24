export const STRIPE_PAYMENT_METHOD_CODE = 'stripe';

/**
 * The simulated card handler. Its code is historical — it is Vendure's
 * dummy-payment-handler, configured through the Dashboard — so the constant exists to
 * stop that string being spelled out at each call site.
 */
export const DEMO_CARD_PAYMENT_METHOD_CODE = 'standard-payment';
