import type {Metadata} from 'next';
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
        <div className="container mx-auto mt-16 px-4 py-16 md:py-20">
            <div className="mx-auto mb-12 max-w-2xl text-center">
                <h1 className="text-4xl font-bold md:text-5xl">{t('pageTitle')}</h1>
                <p className="mt-4 text-lg font-light text-muted-foreground">{t('pageSubtitle')}</p>
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
        <div className="container mx-auto mt-16 px-4 py-16 md:py-20">
            <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center">
                <div className="mx-auto h-12 w-72 animate-pulse rounded-xl bg-muted" />
                <div className="mx-auto h-6 w-full max-w-lg animate-pulse rounded bg-muted" />
            </div>
            <div className="mx-auto h-72 max-w-3xl animate-pulse rounded-3xl bg-muted" />
        </div>
    );
}
