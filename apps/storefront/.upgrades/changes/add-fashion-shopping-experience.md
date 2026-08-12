---
type: minor
areas:
  - collections
  - site
  - products
  - search
  - visual-search
---

## Intent

Make the generic catalogue work as a multi-category clothing storefront: expose nested collections, improve size/colour variant decisions, add stock-aware fashion filters, and let a shopper find visually similar styles from a product page.

## Invariants

- Collection navigation remains data-driven and falls back cleanly when a collection has no children or image.
- Multiple selected values within one facet use OR semantics while selections across facets use AND semantics.
- Product options that cannot form a real variant are disabled, and out-of-stock combinations cannot be added to the cart.
- "Find similar" uses an embedding from the live model revision and excludes the source product.
- Image uploads remain available from the visual-search page and keep their existing validation limits.

## Integration guidance

Preserve downstream branding and category taxonomy while retaining the nested collection data shape and variant compatibility logic. If the visual-search transport is customized, carry the catalogue-image GET proxy alongside the existing multipart upload route.

## Verification

- Browse nested collections on desktop and mobile, including collections without children or featured images.
- Select incompatible and out-of-stock size/colour combinations on a multi-variant product.
- Combine two sizes, a colour, and the in-stock filter and confirm the URL and results preserve OR-within/AND-across behavior.
- Open "Find visually similar styles" from an indexed product and confirm the source product is not returned.
- Run upgrade validation, storefront tests, lint, type checks, and production builds for both apps.
