---
type: patch
areas:
  - account
  - authentication
  - collections
---

## Intent

Make the storefront's page-family hierarchy predictable by sharing authentication headings, aligning email verification with the account workspace, and applying the display-page eyebrow rule consistently.

## Invariants

- Sign-in, registration, password recovery, and password reset retain their existing forms, actions, metadata, and localized copy.
- Token verification keeps URL-dependent work behind Suspense and explicitly allows its locale-provider boundary to block when Next.js cannot validate it as instant.
- Every rendered page state exposes one semantic primary heading.
- Account email verification remains inside the account workspace and keeps all existing success and failure outcomes.
- Notifications remains a standalone authenticated utility page derived from order activity.
- Categories keeps its existing loading presentation while the App Router file remains a thin feature re-export.

## Integration guidance

Preserve downstream auth and account branding while reusing `AuthPageHeader` and `AccountPageHeader`. Use page eyebrows only for top-level display destinations; nested account and informational pages stay intentionally quieter.

## Verification

- Render authentication form, recovery, reset, verification, account, notification, catalogue, and informational routes in English and Khmer.
- Confirm each stable page state has one `h1`, no horizontal overflow at mobile widths, and the expected display or compact heading scale.
- Run upgrade validation, storefront tests, lint, type checks, and a production build.
