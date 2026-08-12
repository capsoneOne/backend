---
type: minor
areas:
  - account
  - site
---

## Intent

Give signed-in shoppers one consistent settings surface for appearance preferences, account management shortcuts, and policy links.

## Invariants

- Appearance choices continue to use the existing `next-themes` provider and persist per device.
- Profile, password, email, and address changes remain owned by their existing account routes.
- The account settings route remains translated, responsive, keyboard accessible, and excluded from search indexing by the account layout.

## Integration guidance

Preserve downstream account navigation and branding while adding Settings as a peer route. Keep theme options connected to the shared theme provider so the navbar switcher and settings page never diverge.

## Verification

- Switch among light, dark, and system themes from account settings and confirm the navbar theme control stays synchronized.
- Follow profile, address, privacy, and terms links at mobile and desktop widths.
- Run upgrade validation, storefront tests, lint, type checks, and a production build.
