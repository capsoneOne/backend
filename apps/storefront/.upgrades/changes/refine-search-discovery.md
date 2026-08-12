---
type: minor
areas:
  - search
  - visual-search
  - site
---

## Intent

Help shoppers recover and refine discovery journeys by filtering visual matches, making autocomplete predictable with a keyboard or screen reader, and providing useful next actions when either search mode returns nothing.

## Invariants

- Visual-result filters operate only on returned match distance and variant pricing; they do not alter embedding inputs, stored vectors, or the frozen embedding-service contract.
- A new visual-search response resets client-side filters so stale constraints never hide fresh matches.
- Header autocomplete retains URL-based text-search submission and product suggestion navigation.
- The same autocomplete behavior is available directly on the mobile Search page without duplicating IDs when both responsive variants are mounted.
- Combobox state exposes expanded, busy, selected-option, and result-count information to assistive technology.
- Empty states always provide at least one recovery action with a 44px mobile touch target.
- Every storefront route shares a main landmark and keyboard-visible skip link.

## Integration guidance

Downstream themes can restyle the controls, but should preserve native select/range semantics, explicit labels, keyboard suggestion navigation, and recovery links. If visual-search response fields change later, keep client filters isolated from the embedding contract.

## Verification

- Filter visual results by match and price, test every sort order, then reset and confirm the original ranking returns.
- Exercise autocomplete with typing, arrow keys, Home/End, Enter, Escape, outside click, and a zero-suggestion query.
- Load a zero-result text search and confirm query-specific guidance and both recovery actions.
- Check narrow mobile, desktop, keyboard-only, focus visibility, accessible names, and 200% zoom/reflow.
- Run upgrade validation, storefront tests, lint, type checks, and a production build.
