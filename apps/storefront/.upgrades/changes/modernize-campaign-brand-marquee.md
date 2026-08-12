---
type: patch
areas:
  - site
---

## Intent

Replace the generic seasonal campaign illustration with a fashion-specific brand marquee that better expresses the storefront's modern clothing identity.

## Invariants

- The campaign remains a server-rendered, localized homepage section.
- Marquee motion is disabled when the visitor prefers reduced motion.
- The visual remains legible in light and dark themes and exposes a localized accessible label.

## Integration guidance

Preserve downstream campaign copy and destinations while adopting the marquee layout. Brand names are decorative fictional labels and can be replaced without changing the component contract.

## Verification

- Run storefront lint, type checks, tests, upgrade validation, and the production build.
- Check the campaign at mobile and desktop widths in both themes and with reduced motion enabled.
