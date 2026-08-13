import Image from 'next/image';

/**
 * Which illustration belongs to which entry point, with each asset's own intrinsic
 * size. The dimensions travel with the `src` rather than sitting in one shared
 * constant because they genuinely differ — the shopping scenes are 750x500 and the
 * recovery one is 500x500. A single pair of numbers would hand `next/image` the
 * wrong aspect ratio for whichever asset did not match.
 */
const ARTWORK = {
    'sign-in': {src: '/storyset/online-shopping-pana.svg', width: 750, height: 500},
    register: {src: '/storyset/ecommerce-campaign-pana.svg', width: 750, height: 500},
    'forgot-password': {src: '/storyset/add-to-cart-cuate.svg', width: 500, height: 500},
} as const;

interface AuthShowcaseProps {
    variant: keyof typeof ARTWORK;
}

/**
 * The visual half of the auth split layout.
 *
 * Artwork only, and deliberately wordless: the form column's heading and
 * description already state the page's purpose, so a second phrasing here was
 * the same message twice, side by side. That also makes this purely decorative —
 * hence the empty `alt`, and no translations to load.
 *
 * Hidden below `lg` — on a phone the form is the entire job, and an illustration
 * above it would just push the first input off the fold.
 */
export function AuthShowcase({variant}: AuthShowcaseProps) {
    const artwork = ARTWORK[variant];

    // Padding is deliberately tight: the artwork is width-constrained, not
    // height-constrained — the panel has vertical slack to spare — so every pixel of
    // horizontal padding comes straight off the illustration's size.
    return (
        <section className="relative hidden overflow-hidden rounded-xl border border-border bg-card/60 p-4 lg:flex lg:flex-col lg:justify-center">
            <Image
                src={artwork.src}
                alt=""
                width={artwork.width}
                height={artwork.height}
                priority
                className="animate-float-art h-auto w-full"
            />
        </section>
    );
}
