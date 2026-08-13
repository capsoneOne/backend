---
type: minor
areas:
  - checkout
---

## Intent

Give card-based demo payment methods a responsive, interactive card-entry experience before the shopper proceeds to order review.

## Invariants

- Non-card payment methods continue directly to review without requesting card details.
- Card details remain browser-local and are never passed to the Vendure standard payment handler or persisted by the storefront.
- Card payment methods require a Luhn-valid number, cardholder name, unexpired date, and three- or four-digit CVV before review.
- English and Khmer storefronts expose matching payment-field copy.

## Integration guidance

Keep the reusable card form under the shared UI component alias. Replace the browser-local demo fields with a payment provider's hosted fields or tokenization SDK before enabling real card processing; raw card data must not be sent through the existing checkout Server Action.

## Verification

- Select the standard card payment method, enter a valid test card and future expiry, and confirm the card preview and review button state update.
- Focus the CVV field and confirm the card flips while reduced-motion preferences remain respected.
- Select a non-card payment method and confirm no card form is required.
- Run upgrade validation, storefront tests, lint, type checks, and the production build.
