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
import {storefrontSectionClass} from '@/components/storefront-section';

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
        <div className="flex min-h-screen flex-col overflow-hidden">
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

            <section className={storefrontSectionClass}>
                <div className="container mx-auto px-4">
                    <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-10 text-primary-foreground shadow-[var(--shadow-e3)] md:px-10 md:py-12 lg:px-14">
                        <div aria-hidden="true" className="absolute -right-20 -top-32 size-96 rounded-full border border-white/15" />
                        <div aria-hidden="true" className="absolute -right-8 -top-20 size-64 rounded-full border border-white/15" />
                        <div className="relative grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/70">
                                    {t('whyShopEyebrow')}
                                </p>
                                <h2 className="mt-3 max-w-lg text-3xl font-bold md:text-4xl">
                                    {t('whyShopWithUs')}
                                </h2>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                {featureKeys.map((feature) => (
                                    <div key={feature.key} className="group rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-sm transition-colors hover:bg-white/12">
                                        <div className="flex size-10 items-center justify-center rounded-xl bg-white/12 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">
                                            <feature.icon className="size-5" />
                                        </div>
                                        <h3 className="mt-5 font-medium">{t(`features.${feature.key}.title`)}</h3>
                                        <p className="mt-2 text-sm font-light leading-relaxed text-primary-foreground/70">
                                            {t(`features.${feature.key}.description`)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function HomepageSectionSkeleton({cards}: {cards: number}) {
    return (
        <section className={storefrontSectionClass} aria-hidden="true">
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
