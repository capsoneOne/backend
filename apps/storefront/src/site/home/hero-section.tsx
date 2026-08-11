import {Button} from "@/components/ui/button";
import {Link} from '@/platform/i18n/navigation';
import {ArrowRight, Camera} from 'lucide-react';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {BrandMark} from '@/site/brand';

/**
 * Editorial hero: one oversized statement, one aperture motif, two routes in.
 *
 * There is deliberately no product photography here. The catalogue starts
 * immediately below the fold, and a hero collage would compete with it while
 * costing the LCP a full image fetch.
 */
export async function HeroSection() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Hero'});

    return (
        <section className="relative overflow-hidden border-b border-border bg-background">
            {/* Dot field, faded to nothing at the edges so the section ends cleanly. */}
            <div className="pointer-events-none absolute inset-0 bg-dotfield opacity-70 [mask-image:radial-gradient(ellipse_65%_60%_at_50%_35%,black,transparent)]" />
            {/* A single soft coral bloom behind the headline — the only place the accent
                appears at scale. */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[52rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--color-primary)_14%,transparent),transparent_62%)] blur-2xl" />

            <div className="container relative mx-auto px-4 pb-24 pt-28 md:pb-28 md:pt-36 lg:pb-32 lg:pt-44">
                <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
                    <div className="animate-fade-up">
                        <BrandMark className="size-14 rounded-2xl elevate-3" />
                    </div>

                    <p className="animate-fade-up mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm [animation-delay:80ms]">
                        <span className="size-1.5 rounded-full bg-primary" />
                        {t('badge')}
                    </p>

                    <h1 className="animate-fade-up mt-6 text-balance text-5xl font-bold leading-[0.95] md:text-7xl lg:text-[5.5rem] [animation-delay:140ms]">
                        {t('title')}{' '}
                        <span className="text-primary">
                            {t('titleHighlight')}
                        </span>
                    </h1>

                    <p className="animate-fade-up mt-6 max-w-xl text-pretty text-lg font-light leading-relaxed text-muted-foreground md:text-xl [animation-delay:200ms]">
                        {t('subtitle')}
                    </p>

                    <div className="animate-fade-up mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row [animation-delay:260ms]">
                        {/* The image route leads, because it is the reason this
                            storefront exists; text search is the familiar fallback. */}
                        <Button
                            render={<Link href="/visual-search" />}
                            nativeButton={false}
                            size="lg"
                            className="group h-12 w-full rounded-full px-7 text-base elevate-2 sm:w-auto"
                        >
                            <Camera className="mr-2 size-4.5" />
                            {t('searchByImage')}
                        </Button>
                        <Button
                            render={<Link href="/search" />}
                            nativeButton={false}
                            variant="outline"
                            size="lg"
                            className="group h-12 w-full rounded-full border-border bg-card/60 px-7 text-base backdrop-blur-sm sm:w-auto"
                        >
                            {t('shopNow')}
                            <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
