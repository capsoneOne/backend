# StyleMatch storefront design system

## Direction

StyleMatch uses a restrained, clothing-first visual language: cool white and
soft blue surfaces, cobalt actions, ink-blue text, generous white space, and
product photography as the strongest visual element. Visual search follows the
same system and does not introduce a separate product identity.

## Core tokens

| Token | Rule |
| --- | --- |
| Primary | Cobalt blue, reserved for actions, focus, prices, and small accents |
| Background | Cool white page canvas |
| Secondary | Pale blue section or supporting surface |
| Text | Ink blue for headings; muted blue-grey for supporting copy |
| Control radius | `rounded-lg` |
| Card and media radius | `rounded-xl` |
| Pill radius | `rounded-full`, only for tags, counters, and circular icon actions |
| Elevation | Borders first; `elevate-2` only for floating overlays and menus |
| Motion | Short fade or subtle image zoom; no layout-shifting hover movement |

## Typography

- Page title: `text-4xl md:text-5xl font-bold`
- Section title: `text-3xl md:text-4xl font-bold`
- Kicker: `text-xs font-bold uppercase tracking-[0.18em] text-primary`
- Body: regular or light weight with `leading-relaxed`
- Ubuntu ships 300, 400, 500, and 700. Avoid synthesized `font-semibold`.

## Page rhythm

- Fixed navigation offset: `mt-[4.5rem]`
- Standard page padding: `py-12 md:py-16`
- Standard section padding: `py-16 md:py-24`
- Content width: shared `container mx-auto px-4`; prose uses `max-w-3xl`
- Page headers use a simple bottom border unless the homepage needs a unique hero

## Page families and breadcrumbs

- Standard store pages use `StorefrontPageShell`: one navigation offset, one content width, and `py-12 md:py-16` vertical rhythm.
- Browse and editorial pages use the display header (`text-4xl md:text-5xl`). Transaction and account pages use its compact variant (`text-3xl md:text-4xl`).
- Breadcrumbs appear only on hierarchical detail pages: ordinary collection detail, product detail, and account order detail.
- Featured is promoted into the primary navigation hierarchy at `/featured`, so it uses the same top-level header as Shop all and has no breadcrumb. `/collection/featured` is a legacy redirect only.
- Top-level destinations—Shop all, Collections, Wishlist, Visual search, Cart, Checkout, Account sections, and informational pages—do not repeat the primary navigation as breadcrumbs.
- Breadcrumbs always sit inside the shared header or immediately above a product purchase panel, with the same spacing and truncation behavior.
- Authentication routes use `AuthPageShell` so recovery and verification screens align with sign-in and registration.

## Components and patterns

- Buttons use one quiet shadow on the primary action and no hover translation.
- Cards use a border, `rounded-xl`, and no default shadow.
- Product tiles remain borderless; their image uses `rounded-xl` and a subtle
  hover zoom. Text and price sit below the image.
- Floating menus may use `elevate-2`; ordinary page content should not.
- Storyset Cuate illustrations appear only in large empty/feature states and
  always include attribution.
- Empty states present one primary recovery action and at most one text link.

## Product-listing pages

- `/search` is the canonical **Shop all** route; adding `?q=` changes the heading and results, not the page structure.
- Keep search input, autocomplete, and camera upload in the global search bar. Do not put persistent catalogue filters inside the input.
- Desktop listing pages use one shared left rail: category links first, then stock and product-facet filters.
- Mobile listing pages replace the rail with the existing filter drawer.
- Collection pages use the same quiet heading and grid shell as Shop all. Collection photography belongs in product/category cards, not in a competing full-width banner.
- Wishlist uses the same page heading and square `ProductTile` as every catalogue grid.

## Accessibility

- Interactive targets remain at least 40px high, with 44px preferred for primary
  shopping actions.
- Focus rings use the shared `ring` token and remain visible on all surfaces.
- Motion respects `prefers-reduced-motion`.
- Colour never carries state alone; labels and icons accompany semantic changes.
