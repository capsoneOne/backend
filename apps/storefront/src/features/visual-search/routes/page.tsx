import type {Metadata} from 'next';
import {Suspense} from 'react';
import {Check} from 'lucide-react';
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
        <div>
            {/* The scanner is the hero. This page's whole promise is "put a photo in
                and get matches out", so the instrument sits in the first viewport
                instead of an illustration pointing at it a scroll further down. */}
            <VisualSearchClient
                initialProduct={source ? {
                    id: source.id,
                    name: source.name,
                    imageUrl: sourceImage?.preview ?? null,
                    assetId: requestedAssetId,
                } : undefined}
                heading={(
                    <>
                        <h1 className="animate-fade-up text-balance text-4xl font-bold leading-[1.04] sm:text-5xl md:text-6xl">
                            {t('pageTitle')}{' '}
                            <span className="text-primary">{t('titleHighlight')}</span>
                        </h1>
                        <p className="animate-fade-up mt-7 max-w-xl text-pretty text-lg font-light leading-relaxed text-muted-foreground md:text-xl [animation-delay:60ms]">
                            {t('pageSubtitle')}
                        </p>
                        <ul className="animate-fade-up mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground [animation-delay:120ms]">
                            {[t('benefitOne'), t('benefitTwo'), t('benefitThree')].map(benefit => (
                                <li key={benefit} className="flex items-center gap-2">
                                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <Check className="size-3" aria-hidden="true" />
                                    </span>
                                    {benefit}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            />

            <HowItWorks />
        </div>
    );
}

/**
 * The explainer, below the instrument rather than above it.
 *
 * Deliberately not three cards: the steps are a sequence, so they are an ordered
 * list divided by rules, with the numerals carrying the structure. Boxing them
 * would put three more cards on a page whose only cards should be products.
 */
async function HowItWorks() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'VisualSearch'});

    const steps = [
        {title: t('stepOneTitle'), body: t('stepOneDescription')},
        {title: t('stepTwoTitle'), body: t('stepTwoDescription')},
        {title: t('stepThreeTitle'), body: t('stepThreeDescription')},
    ];

    return (
        <section className="container mx-auto px-4 pb-16 pt-14 md:pb-24 md:pt-16">
            {/* Left-aligned, not centred: the heading shares an edge with step 01
                below it, so the whole band hangs off one line. */}
            <div className="reveal-section max-w-2xl">
                <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
                    {t('uploadTitle')}
                </h2>
                <p className="mt-4 text-pretty font-light leading-relaxed text-muted-foreground md:text-lg">
                    {t('uploadDescription')}
                </p>
            </div>

            <ol className="reveal-section mt-12 grid border-t border-border sm:grid-cols-3">
                {steps.map(({title, body}, index) => (
                    <li
                        key={title}
                        className="border-b border-border px-1 py-8 sm:border-b-0 sm:px-7 sm:py-9 sm:first:pl-0 sm:last:pr-0 sm:[&+li]:border-l"
                    >
                        <span
                            aria-hidden="true"
                            className="block text-5xl font-bold tabular-nums leading-none tracking-tight text-primary/25"
                        >
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className="mt-6 text-lg font-bold">{title}</h3>
                        <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">{body}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function VisualSearchPageSkeleton() {
    return (
        <div>
            <div className="border-b border-border bg-secondary/20 pt-[4.5rem]">
                <div className="container mx-auto grid items-center gap-12 px-4 py-12 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
                    <div className="space-y-5">
                        <div className="h-28 w-full max-w-xl animate-pulse rounded-xl bg-muted" />
                        <div className="h-14 w-full max-w-lg animate-pulse rounded-xl bg-muted" />
                        <div className="h-5 w-72 animate-pulse rounded-full bg-muted" />
                    </div>
                    <div className="min-h-[25rem] w-full animate-pulse rounded-2xl bg-muted lg:min-h-[27rem]" />
                </div>
            </div>
            <div className="container mx-auto px-4 pb-16 pt-14 md:pb-24 md:pt-20">
                <div className="h-24 max-w-2xl animate-pulse rounded-xl bg-muted" />
                <div className="mt-12 h-44 animate-pulse rounded-xl bg-muted" />
            </div>
        </div>
    );
}
