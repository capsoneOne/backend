---
area: account
type: feature
---

# Add curated customer avatars

Customers can choose one of ten original StyleMatch avatars from their profile. The
selection is stored as a validated preset key on the Vendure customer record and is
shown in the navbar account control and account menu.

## Upgrade impact

- Deploy the accompanying Vendure customer custom-field migration before serving the
  updated storefront.
- The storefront expects `/public/avatars/avatar-01.png` through `avatar-10.png`.
- No arbitrary upload URL is accepted; only keys listed in `features/account/avatars.ts`
  can be saved.

## Verification

- Run `npm run build`.
- Run `npm run verify`.
- Sign in, choose an avatar on the profile page, save it, and confirm it appears in the
  navbar and remains selected after a reload.
