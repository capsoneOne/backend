import Image from 'next/image';
import {getTranslations} from 'next-intl/server';

import {getRouteLocale} from '@/platform/i18n/server';

/**
 * Which illustration belongs to which entry point: returning shoppers get the
 * checkout scene, new ones get the storefront they are about to browse.
 */
const ARTWORK = {
    'sign-in': '/storyset/ecommerce-checkout-laptop-amico.svg',
    register: '/storyset/ecommerce-web-page-amico.svg',
} as const;

interface AuthShowcaseProps {
    variant: keyof typeof ARTWORK;
}

/**
 * The narrative half of the auth split layout: one line of copy and the artwork.
 *
 * Hidden below `lg` — on a phone the form is the entire job, and an illustration
 * above it would just push the first input off the fold.
 */
export async function AuthShowcase({variant}: AuthShowcaseProps) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});

    return (
        <section className="relative hidden overflow-hidden rounded-xl border border-border bg-card/60 p-6 lg:flex lg:flex-col lg:justify-center">
            {/* No brand eyebrow here — AuthPageHeader already carries it on the form
                side, and repeating it reads as a duplicate rather than a pairing. */}
            {/* Natural height — the artwork keeps its full size and the form column
                stretches up to meet it, rather than the art shrinking down to the form. */}
            <div className="space-y-4">
                <p className="text-balance text-sm font-light leading-relaxed text-foreground">
                    {t(variant === 'sign-in' ? 'welcomeBack' : 'joinUs')}
                </p>

                <Image
                    src={ARTWORK[variant]}
                    alt=""
                    width={500}
                    height={500}
                    priority
                    className="animate-float-art h-auto w-full"
                />
            </div>
        </section>
    );
}
