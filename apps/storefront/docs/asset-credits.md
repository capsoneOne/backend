# Asset credits

Third-party imagery shipped in `apps/storefront/public/`.

## Photography

| File | Source | Photographer | License |
| --- | --- | --- | --- |
| `public/hero/marketplace-shopping-bags.jpg` | [Unsplash](https://unsplash.com/photos/woman-holding-colorful-shopping-bags-against-a-wall-MX320XB5oR8) | Iuliia Pilipeichenko ([@pilipeichenko](https://unsplash.com/@pilipeichenko)) | [Unsplash License](https://unsplash.com/license) |
| `public/hero/editorial-outerwear.jpg` | [Unsplash](https://unsplash.com/photos/young-woman-with-wet-hair-wearing-an-olive-green-suit-21cIJlKSWGw) | ola szkolda ([@olaszkolda](https://unsplash.com/@olaszkolda)) | [Unsplash License](https://unsplash.com/license) |

The Unsplash License covers commercial use with no permission required; attribution
is appreciated but not required, which is why the credits live here rather than in
the UI.

Both files are cropped to 3:4 and re-encoded at 1200×1600 for the homepage hero
card, whose art slot is `aspect-[4/5]` on small screens and `lg:aspect-[3/4]`.

`editorial-outerwear.jpg` is **kept deliberately and is currently unreferenced.** It
is the fashion-first alternative to the shopping-bag hero: the bags match the
homepage copy, which promises technology, beauty, home and sport, while the
editorial shot matches the catalogue and the fine-tuned fashion-clip index, which
are fashion only. Whichever way the hero copy is rewritten, one of these two is the
right image — so do not prune it as a dead asset without making that call first.

Only photos served from `images.unsplash.com` are usable here. Anything on
`plus.unsplash.com` is Unsplash+ and needs a paid subscription, so check the host
before swapping in a replacement.

## Illustrations

- `public/storyset/*` — [Storyset](https://storyset.com/) (free with attribution).
- `public/open-doodles/*` — [Open Doodles](https://opendoodles.com/) (CC0).
