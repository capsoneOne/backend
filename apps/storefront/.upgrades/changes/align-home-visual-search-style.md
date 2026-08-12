---
type: patch
areas:
  - authentication
  - orders
  - platform.next
  - products
  - site
  - visual-search
---

## Intent

Align the homepage presentation with the visual-search page through a shared, larger hero composition, restrained surfaces, and consistent feature cards while preserving the homepage's commerce-focused content. Standardize the shared page header used by catalogue, cart, checkout, account, wishlist, search, collection, and content pages, then bring product, authentication, order confirmation, navigation drawers, and recovery states into the same surface and action system.

## Invariants

- Homepage routes, localized copy, shopping actions, merchandising queries, and section order remain unchanged.
- The primary catalogue action, visual-search action, category navigation, and illustration credit remain accessible at all supported viewport sizes.
- The homepage continues to use the existing design tokens and optimized Next.js image component.
- Page families continue to preserve their distinct information architecture while sharing surface, spacing, typography, and loading-state treatments.
- Circular geometry remains reserved for semantic uses such as status indicators, icon controls, badges, and pagination; primary actions use the shared rounded-rectangle treatment.
- Unmatched URLs render a branded global not-found document even though the locale is the application's root dynamic segment.

## Integration guidance

Preserve downstream brand tokens and page copy when adopting this change. Custom hero artwork can be retained through the shared hero component, and page-specific actions remain supported by the shared page header. Root-level recovery UI must remain self-contained even while visually approximating the storefront tokens.

## Verification

- Run storefront type checks, lint, tests, upgrade validation, and the production build.
- Inspect the homepage hero and feature cards at desktop and mobile widths.
- Compare Home, Visual Search, catalogue, content, account, and authentication page families for consistent tokens and hierarchy.
- Inspect product detail, order confirmation, not-found, route-error, and cart-drawer states at desktop and mobile widths.
