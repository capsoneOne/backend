---
type: minor
areas:
  - products
  - search
---

## Intent

Make clothing shopping practical on small screens with a persistent, variant-aware purchase action and a filter flow that supports several selections before refreshing the catalogue.

## Invariants

- The mobile purchase bar uses the same selected variant, stock state, price, pending state, and add-to-cart action as the main product CTA.
- An incomplete variant selection scrolls shoppers to the option controls instead of adding an arbitrary variant.
- Sold-out variants cannot be added from either purchase action.
- Mobile filter changes remain drafts until the shopper applies them; desktop filters continue to update immediately.
- In-stock filtering remains available even when a catalogue has not published any facet values yet.
- Applied filters remain URL-backed, shareable, and compatible with existing search and pagination behavior.

## Integration guidance

Preserve the shared purchase state when customizing product layouts. Downstream filter UI can change presentation, but it should retain staged mobile updates, explicit apply/clear actions, and URL-backed applied state.

## Verification

- On a narrow product page, select variant options and verify price, stock, and both add-to-cart buttons stay synchronized.
- Verify tapping Select Options scrolls to the option controls and sold-out selections disable purchase.
- On mobile search, select multiple filters without closing the drawer, apply once, and verify the URL and grid update.
- Remove active filter chips individually, clear all filters, and confirm pagination resets to page one.
- Run upgrade validation, storefront tests, lint, type checks, and a production build.
