import type {Metadata} from 'next';
import Image from 'next/image';
import {Suspense} from 'react';
import {ArrowDown, Check, Crop, ScanSearch, ShoppingBag} from 'lucide-react';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME, noIndexRobots} from '@/config/metadata';
import {VisualSearchClient} from '@/features/visual-search/components/visual-search-client';
import {GetVisualSearchSourceProductQuery} from '@/features/visual-search/graphql';
import {query} from '@/platform/vendure/api';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'VisualSearch'});
    return {
        title: t('pageTitle'),
        description: t('metaDescription', {siteName: SITE_NAME}),
        // Results depend on an uploaded image, so there is nothing stable to index.
        robots: noIndexRobots(),
    };
}

export default function VisualSearchPage({searchParams}: PageProps<'/[locale]/visual-search'>) {
    return (
        <Suspense fallback={<VisualSearchPageSkeleton />}>
            <VisualSearchPageContent searchParams={searchParams} />
        </Suspense>
    );
}

async function VisualSearchPageContent({
    searchParams,
}: {
    searchParams: PageProps<'/[locale]/visual-search'>['searchParams'];
}) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'VisualSearch'});
    const {productId, assetId} = await searchParams;
    const sourceResult = typeof productId === 'string'
        ? await query(GetVisualSearchSourceProductQuery, {id: productId}, {languageCode: locale}).catch(() => null)
        : null;
    const source = sourceResult?.data.product;
    const requestedAssetId = typeof assetId === 'string' ? assetId : undefined;
    const sourceAssets = source
        ? [...source.assets, ...source.variants.flatMap(variant => variant.assets)]
        : [];
    const sourceImage = sourceAssets.find(asset => asset.id === requestedAssetId)
        ?? source?.featuredAsset;

    return (
        <div className="mt-[4.5rem]">
            <section className="border-b border-border bg-secondary/20">
                <div className="container mx-auto grid items-center gap-10 px-4 py-12 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
                    <div className="relative z-10 max-w-2xl">
                        <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.18em] text-primary">
                            {t('eyebrow')}
                        </p>
                        <h1 className="animate-fade-up mt-4 text-balance text-4xl font-bold leading-[1.06] md:text-5xl [animation-delay:60ms]">
                            {t('pageTitle')}{' '}
                            <span className="text-primary">{t('titleHighlight')}</span>
                        </h1>
                        <p className="animate-fade-up mt-6 max-w-xl text-pretty text-lg font-light leading-relaxed text-muted-foreground md:text-xl [animation-delay:120ms]">
                            {t('pageSubtitle')}
                        </p>

                        <div className="animate-fade-up mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground [animation-delay:180ms]">
                            {[t('benefitOne'), t('benefitTwo'), t('benefitThree')].map(benefit => (
                                <span key={benefit} className="flex items-center gap-2">
                                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <Check className="size-3" aria-hidden="true" />
                                    </span>
                                    {benefit}
                                </span>
                            ))}
                        </div>

                        <a
                            href="#visual-search-upload"
                            className="animate-fade-up mt-8 inline-flex min-h-12 items-center rounded-lg bg-primary px-6 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [animation-delay:240ms]"
                        >
                            {t('heroCta')}
                            <ArrowDown className="ml-2 size-4" aria-hidden="true" />
                        </a>
                    </div>

                    <div className="animate-fade-up relative mx-auto w-full max-w-[29rem] rounded-xl border border-border bg-background/70 p-4 [animation-delay:100ms]">
                        <Image
                            src="/storyset/online-shopping-cuate.svg"
                            alt={t('illustrationAlt')}
                            width={500}
                            height={500}
                            priority
                            className="h-auto w-full object-contain"
                        />
                        <p className="relative mt-1 text-center text-[0.6875rem] text-muted-foreground">
                            <a
                                href="https://storyset.com/illustration/online-shopping/cuate"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                            >
                                {t('illustrationCredit')}
                            </a>
                        </p>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-14 md:py-16">
                <div className="reveal-section mx-auto mb-10 max-w-2xl text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('uploadEyebrow')}</p>
                    <h2 className="mt-3 text-balance text-3xl font-bold md:text-4xl">{t('uploadTitle')}</h2>
                    <p className="mt-4 text-pretty font-light leading-relaxed text-muted-foreground md:text-lg">
                        {t('uploadDescription')}
                    </p>
                </div>

                <VisualSearchClient
                    initialProduct={source ? {
                        id: source.id,
                        name: source.name,
                        imageUrl: sourceImage?.preview ?? null,
                        assetId: requestedAssetId,
                    } : undefined}
                />

                <div className="reveal-section mx-auto mt-16 max-w-5xl border-t border-border pt-12">
                    <div className="grid gap-5 md:grid-cols-3">
                        {[
                            {icon: ShoppingBag, step: '01', title: t('stepOneTitle'), body: t('stepOneDescription')},
                            {icon: Crop, step: '02', title: t('stepTwoTitle'), body: t('stepTwoDescription')},
                            {icon: ScanSearch, step: '03', title: t('stepThreeTitle'), body: t('stepThreeDescription')},
                        ].map(({icon: Icon, step, title, body}) => (
                            <div key={step} className="rounded-xl border border-border bg-card p-6">
                                <div className="flex items-center justify-between">
                                    <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                                        <Icon className="size-5" aria-hidden="true" />
                                    </span>
                                    <span className="text-sm font-bold text-primary/45">{step}</span>
                                </div>
                                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                                <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

function VisualSearchPageSkeleton() {
    return (
        <div className="mt-[4.5rem]">
            <div className="border-b border-border bg-secondary/50">
                <div className="container mx-auto grid min-h-[37rem] items-center gap-8 px-4 py-14 lg:grid-cols-2">
                    <div className="space-y-5">
                        <div className="h-8 w-36 animate-pulse rounded-full bg-muted" />
                        <div className="h-28 w-full max-w-xl animate-pulse rounded-xl bg-muted" />
                        <div className="h-14 w-full max-w-lg animate-pulse rounded-xl bg-muted" />
                    </div>
                    <div className="mx-auto aspect-square w-full max-w-[28rem] animate-pulse rounded-xl bg-muted" />
                </div>
            </div>
            <div className="container mx-auto px-4 py-16">
                <div className="mx-auto h-24 max-w-2xl animate-pulse rounded-xl bg-muted" />
                <div className="mx-auto mt-10 h-80 max-w-4xl animate-pulse rounded-xl bg-muted" />
            </div>
        </div>
    );
}
