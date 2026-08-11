import type {Metadata} from "next";
import {Suspense} from "react";
import {getRouteLocale} from "@/platform/i18n/server";
import {HeroSection} from "@/site/home/hero-section";
import {NewArrivalsSection, SaleSection} from '@/features/products/home-merchandising';
import {SITE_NAME, SITE_URL, buildCanonicalUrl} from "@/config/metadata";
import {BadgeCheck, Tag, Zap} from "lucide-react";
import {getTranslations} from 'next-intl/server';
import {toOgLocale} from '@/platform/i18n/locale-utils';
import {ShopByCategory} from '@/site/home/shop-by-category';

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
            <Suspense fallback={<HomepageSectionSkeleton cards={6}/>}>
                <ShopByCategory/>
            </Suspense>
            <Suspense fallback={<HomepageSectionSkeleton cards={4}/>}>
                <NewArrivalsSection/>
            </Suspense>
            <Suspense fallback={<HomepageSectionSkeleton cards={4}/>}>
                <SaleSection/>
            </Suspense>

            <section className="border-t border-border bg-secondary/20 py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                            {t('whyShopEyebrow')}
                        </p>
                        <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                            {t('whyShopWithUs')}
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-5 md:grid-cols-3">
                        {featureKeys.map((feature) => (
                            <div
                                key={feature.key}
                                className="rounded-xl border border-border bg-card p-7"
                            >
                                <div className="flex size-11 items-center justify-center rounded-lg bg-secondary text-primary">
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

function HomepageSectionSkeleton({cards}: {cards: number}) {
    return (
        <section className="border-b border-border py-16 md:py-24" aria-hidden="true">
            <div className="container mx-auto px-4">
                <div className="h-4 w-36 animate-pulse rounded bg-muted"/>
                <div className="mt-3 h-10 w-72 animate-pulse rounded-lg bg-muted"/>
                <div className="mt-3 h-5 w-full max-w-lg animate-pulse rounded bg-muted"/>
                <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
                    {Array.from({length: cards}).map((_, index) => (
                        <div key={index} className={index > 3 ? 'hidden lg:block' : ''}>
                            <div className="aspect-square animate-pulse rounded-xl bg-muted"/>
                            <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-muted"/>
                            <div className="mt-2 h-5 w-1/3 animate-pulse rounded bg-muted"/>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
