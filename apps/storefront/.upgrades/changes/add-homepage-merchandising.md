---
type: minor
areas:
  - products
  - site
  - tooling
---

## Intent

Give clothing shoppers useful homepage entry points through real New Arrivals, Sale, and category merchandising rather than one generic featured-product rail.

## Invariants

- New Arrivals are ordered by product creation time from the Shop API.
- Sale labels appear only for products in a published, non-empty Vendure collection configured by `NEXT_PUBLIC_SALE_COLLECTION_SLUG`.
- The Sale section disappears cleanly when that collection is absent or empty; the storefront never invents a discount.
- Category cards remain driven by the published collection hierarchy.
- Product cards retain wishlist, quick-add, stock, price-range, currency, and responsive carousel behavior; sold-out cards never expose an active quick-add control.

## Integration guidance

Preserve downstream homepage composition and styling, but keep New Arrivals tied to `createdAt` and Sale tied to explicit merchandising data. If a downstream store uses another sale collection slug, set `NEXT_PUBLIC_SALE_COLLECTION_SLUG` rather than hard-coding a route.

## Verification

- Confirm newly created products appear first in New Arrivals.
- Publish a populated Sale collection and confirm the rail, badges, link, and description appear.
- Remove or empty that collection and confirm the Sale rail is omitted without an error.
- Check two-column mobile and four-column desktop carousel states, including a catalog with four or fewer products.
- Run upgrade validation, storefront tests, lint, type checks, and a production build.
