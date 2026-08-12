import Image from 'next/image';

/**
 * Which illustration belongs to which entry point: returning shoppers get the
 * checkout scene, new ones get the storefront they are about to browse.
 */
const ARTWORK = {
    'sign-in': '/storyset/online-shopping-pana.svg',
    register: '/storyset/ecommerce-campaign-pana.svg',
} as const;

/** Both assets share a 750x500 viewBox; `next/image` needs it to reserve the right box. */
const ARTWORK_WIDTH = 750;
const ARTWORK_HEIGHT = 500;

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
    // Padding is deliberately tight: the artwork is width-constrained, not
    // height-constrained — the panel has vertical slack to spare — so every pixel of
    // horizontal padding comes straight off the illustration's size.
    return (
        <section className="relative hidden overflow-hidden rounded-xl border border-border bg-card/60 p-4 lg:flex lg:flex-col lg:justify-center">
            <Image
                src={ARTWORK[variant]}
                alt=""
                width={ARTWORK_WIDTH}
                height={ARTWORK_HEIGHT}
                priority
                className="animate-float-art h-auto w-full"
            />
        </section>
    );
}
