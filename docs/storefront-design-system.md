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
- Top-level browse, utility, and transaction pages use the display header (`text-4xl md:text-5xl`). Nested account-management pages use its compact variant (`text-3xl md:text-4xl`).
- Breadcrumbs appear only on hierarchical detail pages: ordinary collection detail, product detail, and account order detail.
- Featured is promoted into the primary navigation hierarchy at `/featured`, so it uses the same top-level header as Shop all and has no breadcrumb. `/collection/featured` is a legacy redirect only.
- Top-level destinations—Shop all, Collections, Wishlist, Visual search, Cart, Checkout, Account sections, and informational pages—do not repeat the primary navigation as breadcrumbs.
- Breadcrumbs always sit inside the shared header or immediately above a product purchase panel, with the same spacing and truncation behavior.
- Authentication routes use `AuthPageShell` so recovery and verification screens align with sign-in and registration.

## Global navigation

- Desktop product navigation contains two text destinations: **Shop** and **Categories**. Search remains the central discovery control.
- Wishlist, Notifications, Cart, and Profile are utility actions grouped on the right and use the same 44px icon target.
- Categories opens one catalogue menu and links to `/categories`; individual collections do not become competing top-level navigation items.
- Mobile exposes Shop, Categories, Wishlist, Cart, Notifications, and Profile as a compact destination grid, followed by the actual category taxonomy.
- Notifications are not decorative: `/notifications` is a standalone authenticated feed derived from the shopper's recent order updates. It is a global store utility and does not inherit account navigation.

## Components and patterns

- Buttons use one quiet shadow on the primary action and no hover translation.
- Cards use a border, `rounded-xl`, and no default shadow.
- Product tiles remain borderless; their image uses `rounded-xl` and a subtle
  hover zoom. Text and price sit below the image.
- Floating menus may use `elevate-2`; ordinary page content should not.
- Storyset Cuate illustrations appear only in large empty/feature states and
  always include attribution.
- Empty states present one primary recovery action and at most one text link.
- Wishlist and Notifications share the same `max-w-4xl` two-column empty-state card: pale-blue illustration panel, Storyset attribution, and a focused text-and-action panel.
- Use **Wishlist** consistently in customer-facing copy. Do not alternate between Wishlist, Saved, and Saved items for the same feature.

## Product-listing pages

- `/search` is the canonical **Shop all** route; adding `?q=` changes the heading and results, not the page structure.
- Keep text autocomplete and camera upload in the global search bar. The bar may include one lightweight category scope selector; detailed stock, size, colour, price, and availability filters stay in the listing-page rail or mobile filter drawer.
- Global search uses the shared `rounded-xl` control shape at 44px high. It has one clear action, one separated camera action, and a compact border-first results panel; never show both a browser-native clear button and a custom clear button.
- Category scope uses one quiet selected-value trigger and a hierarchical menu: **All products**, then each parent category with an **All [category]** option followed by its subcategories. Do not use the browser-native select appearance or repeat a category name as both a group label and an identical option.
- Desktop listing pages use one shared left rail: category links first, then stock and product-facet filters.
- Mobile listing pages replace the rail with the existing filter drawer.
- Collection pages use the same quiet heading and grid shell as Shop all. Collection photography belongs in product/category cards, not in a competing full-width banner.
- Wishlist uses the same page heading and square `ProductTile` as every catalogue grid.

## Cart and checkout

- Cart and Checkout use the standard page shell, display header, and a shared `max-w-6xl` transaction canvas.
- Desktop transaction layouts use one flexible content column and one `22rem` summary rail with a `2.5rem` gutter; mobile places the collapsible order summary before checkout steps.
- Line items, summaries, promotion controls, progress, and checkout steps use the shared border-first `rounded-xl` card treatment without ordinary drop shadows.
- Primary transaction actions are at least 44px tall. Quantity and remove controls are at least 40px and always include accessible labels.
- Empty Cart uses the same two-column Storyset Cuate empty-state pattern as Wishlist and Notifications.

## Account workspace

- Orders, Addresses, Profile, and Settings share one `max-w-6xl` account workspace with a `15rem` desktop navigation rail and a horizontally scrollable mobile destination bar.
- Account destinations use `AccountPageHeader`, always in the compact variant with a concise supporting description.
- Active account navigation uses a pale-primary fill and text, matching the active state used by global utility navigation.
- Account section cards use `rounded-xl`, `border-border`, no ordinary shadow, and a consistent 24px vertical gap.
- Record-based sections use `AccountEmptyState` for compact icon, title, description, and recovery action treatment.
- Primary form and record actions are at least 44px tall; icon-only menus remain at least 40px.

## Catalogue taxonomy

- **Featured** is an editorial collection, not a product category. It may power home merchandising and `/featured`, but it does not appear inside category lists or filters.
- Top-level categories use product-type groupings: **Clothing**, **Shoes**, and **Accessories**.
- Subcategories stay task-focused and scannable: Jackets and Rainwear; Sneakers and Boots; Bags, Eyewear, and Scarves.
- Every category has a concise description, a representative product image, a working product filter, and a stable `/collection/[slug]` destination.

## Accessibility

- Interactive targets remain at least 40px high, with 44px preferred for primary
  shopping actions.
- Focus rings use the shared `ring` token and remain visible on all surfaces.
- Motion respects `prefers-reduced-motion`.
- Colour never carries state alone; labels and icons accompany semantic changes.
