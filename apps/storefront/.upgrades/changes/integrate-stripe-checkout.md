---
type: minor
areas:
  - checkout
---

## Intent

Replace browser-managed demo card fields with Stripe's hosted Payment Element and Vendure's Stripe PaymentIntent/webhook flow.

## Invariants

- Raw card numbers, expiry values, and security codes are collected by Stripe.js and never enter storefront or Vendure application state.
- The Vendure order total is the authoritative amount used to create each PaymentIntent.
- A successful, signature-verified Stripe webhook settles the Vendure order; a browser redirect alone never marks an order paid.
- The confirmation page reports a pending state and refreshes briefly while waiting for the webhook, rather than claiming success early.
- Non-Stripe payment handlers retain the existing Vendure `addPaymentToOrder` flow.
- English and Khmer storefronts expose matching payment status and error copy.

## Integration guidance

Set the browser-safe `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in the storefront. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` only in the server environment, then run the idempotent seed to create the channel's Stripe payment method. In production, configure Stripe to send `payment_intent.succeeded` and `payment_intent.payment_failed` to `/payments/stripe` on the public Vendure host.

## Verification

- Forward Stripe CLI webhooks to the local Vendure `/payments/stripe` endpoint and complete a payment with Stripe's `4242 4242 4242 4242` test card.
- Confirm a successful webhook changes the Vendure order to `PaymentSettled` and the localized confirmation route loads.
- Confirm declined and authentication-required test cards remain in checkout with an actionable error.
- Run server/storefront builds, storefront lint, type checks, tests, and upgrade validation.
