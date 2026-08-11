import type {Metadata} from 'next';
import Image from 'next/image';
import {Suspense} from 'react';
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
        <div className="container mx-auto mt-[4.5rem] px-4 py-12 md:py-16">
            <div className="reveal-section mx-auto mb-12 grid max-w-5xl items-center gap-8 overflow-hidden rounded-3xl border border-border bg-card p-7 elevate-1 sm:p-10 lg:grid-cols-[1fr_18rem]">
                <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">{t('eyebrow')}</p>
                    <h1 className="mt-4 text-4xl font-bold md:text-5xl">{t('pageTitle')}</h1>
                    <p className="mt-4 max-w-2xl text-lg font-light leading-relaxed text-muted-foreground">{t('pageSubtitle')}</p>
                </div>
                <div className="relative mx-auto w-full max-w-64">
                    <div className="absolute inset-[12%] rounded-full bg-secondary" />
                    <Image
                        src="/storyset/search-engines-cuate.svg"
                        alt={t('illustrationAlt')}
                        width={500}
                        height={500}
                        className="animate-float-art relative h-auto w-full object-contain"
                    />
                    <p className="mt-1 text-center text-[0.6875rem] text-muted-foreground">
                        <a
                            href="https://storyset.com/illustration/search-engines/cuate"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                        >
                            {t('illustrationCredit')}
                        </a>
                    </p>
                </div>
            </div>
            <VisualSearchClient
                initialProduct={source ? {
                    id: source.id,
                    name: source.name,
                    imageUrl: sourceImage?.preview ?? null,
                    assetId: requestedAssetId,
                } : undefined}
            />
        </div>
    );
}

function VisualSearchPageSkeleton() {
    return (
        <div className="container mx-auto mt-[4.5rem] px-4 py-12 md:py-16">
            <div className="mx-auto mb-12 grid max-w-5xl gap-8 rounded-3xl border border-border bg-card p-7 sm:p-10 lg:grid-cols-[1fr_18rem]">
                <div className="space-y-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-12 w-72 max-w-full animate-pulse rounded-xl bg-muted" />
                    <div className="h-6 w-full max-w-lg animate-pulse rounded bg-muted" />
                </div>
                <div className="mx-auto aspect-square w-full max-w-56 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mx-auto h-72 max-w-3xl animate-pulse rounded-3xl bg-muted" />
        </div>
    );
}
