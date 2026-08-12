---
type: minor
areas:
  - cart
  - collections
  - platform.i18n
  - platform.next
  - products
  - search
  - site
  - visual-search
  - wishlist
---

## Intent

Generalize StyleMatch from a clothing-first storefront into a category-neutral marketplace whose brand, discovery copy, navigation, empty states, and guidance can support any product department.

## Invariants

- Category navigation remains driven by the published Vendure collection hierarchy and scales safely as departments are added.
- Apparel-specific size guidance remains available only when a product exposes a size option group.
- Text and visual search continue to use the same APIs, filters, upload limits, ranking, and privacy behavior.
- Existing cart, wishlist, account, locale, product-option, and checkout behavior remains unchanged.
- English and Khmer continue to expose matching message structures.

## Integration guidance

Preserve downstream store names, departments, and merchandising language while adopting the category-neutral shared copy and marketplace mark. Replace the sample department list with the retailer's real Vendure taxonomy; do not hard-code department behavior in the storefront.

## Verification

- Browse home, categories, collection, search, visual search, product, wishlist, cart, help, and about surfaces in English and Khmer.
- Confirm a large category hierarchy remains scrollable on desktop and usable from the mobile drawer.
- Confirm apparel products still show the size guide while unrelated option groups do not.
- Run upgrade validation, storefront tests, lint, type checks, and the production build.
