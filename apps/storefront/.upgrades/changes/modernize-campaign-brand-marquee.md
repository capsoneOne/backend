---
type: patch
areas:
  - site
---

## Intent

Replace the generic blue seasonal campaign banner with a full-viewport-width fashion marquee that pairs modern label treatments with shopper-style feedback cards.

## Invariants

- The campaign remains a server-rendered, localized homepage section without a colored promotional container.
- Marquee motion is disabled when the visitor prefers reduced motion.
- The visual remains legible in light and dark themes and exposes a localized accessible label.
- Feedback, reviewer labels, and rating labels remain localized and accessible.

## Integration guidance

Preserve downstream campaign copy and destinations while adopting the marquee layout. Brand names and shopper stories are sample content and can be replaced with real downstream review data without changing the visual structure.

## Verification

- Run storefront lint, type checks, tests, upgrade validation, and the production build.
- Check the campaign at mobile and desktop widths in both themes and with reduced motion enabled.
