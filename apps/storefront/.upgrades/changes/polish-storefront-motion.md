---
type: patch
areas:
  - site
  - products
---

## Intent

Create a more polished and responsive storefront experience through a consistent motion language, richer shared surfaces, personalized signed-in context, clearer interactive feedback, and a more trustworthy footer across home, catalogue, product, and navigation surfaces.

## Invariants

- Motion remains decorative, progressive, and disabled when the visitor requests reduced motion.
- Existing routes, merchandising data, localized copy, product actions, and responsive navigation behavior remain unchanged.
- Navbar links, menu triggers, and icon controls share one hover, press, focus, and active-state treatment.
- Product imagery continues to use the optimized Next.js image component and preserve stable aspect ratios.
- The personalized homepage welcome remains signed-in-only and derives its time-sensitive greeting in the shopper's browser.
- Footer payment marks stay informational and clearly disclose the storefront's demo-only payment processing.

## Integration guidance

Preserve downstream brand tokens when adopting the shared motion utilities. Product tiles, catalogue headers, and hero treatments may retain custom content, but should keep visible keyboard focus and the reduced-motion behavior defined in the global stylesheet. Homepage merchandising sections should compose the shared storefront section header and action-link pattern instead of recreating those styles locally.

## Verification

- Run storefront type checks, lint, tests, upgrade validation, and the production build.
- Confirm that hover-only effects are gated to capable pointer devices and all actions remain visible on touch screens.
