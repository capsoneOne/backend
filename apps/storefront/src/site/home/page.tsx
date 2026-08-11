import type {Metadata} from "next";
import {Suspense} from "react";
import {getRouteLocale} from "@/platform/i18n/server";
import {HeroSection} from "@/site/home/hero-section";
import {FeaturedProducts} from '@/features/products/featured-products';
import {SITE_NAME, SITE_URL, buildCanonicalUrl} from "@/config/metadata";
import {BadgeCheck, Tag, Zap} from "lucide-react";
import {getTranslations} from 'next-intl/server';
import {toOgLocale} from '@/platform/i18n/locale-utils';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});
    const ogLocale = toOgLocale(locale);

    return {
        title: {
            absolute: `${SITE_NAME} - ${t('pageTitle')}`,
        },
        description: t('description'),
        alternates: {
            canonical: buildCanonicalUrl("/"),
        },
        openGraph: {
            title: `${SITE_NAME} - ${t('pageTitle')}`,
            description: t('ogDescription'),
            type: "website",
            locale: ogLocale,
            url: SITE_URL,
        },
    };
}

const featureKeys = [
    {icon: BadgeCheck, key: 'highQuality'},
    {icon: Tag, key: 'bestPrices'},
    {icon: Zap, key: 'fastDelivery'},
] as const;

export default async function Home() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});

    return (
        <div className="flex min-h-screen flex-col">
            <HeroSection/>
            <Suspense>
                <FeaturedProducts/>
            </Suspense>

            <section className="border-t border-border bg-muted/40 py-20 md:py-28">
                <div className="container mx-auto px-4">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
                            {t('whyShopEyebrow')}
                        </p>
                        <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                            {t('whyShopWithUs')}
                        </h2>
                    </div>

                    <div className="mt-14 grid gap-5 md:grid-cols-3">
                        {featureKeys.map((feature) => (
                            <div
                                key={feature.key}
                                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:elevate-3"
                            >
                                {/* Hairline that lights up on hover — cheaper visually than
                                    a full colour wash, and it survives dark mode. */}
                                <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-primary to-transparent transition-transform duration-500 group-hover:scale-x-100" />
                                <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform duration-300 group-hover:scale-105">
                                    <feature.icon className="size-5.5" />
                                </div>
                                <h3 className="mt-6 text-lg font-medium">{t(`features.${feature.key}.title`)}</h3>
                                <p className="mt-2 font-light leading-relaxed text-muted-foreground">
                                    {t(`features.${feature.key}.description`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
