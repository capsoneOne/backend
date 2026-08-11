import type { Metadata } from 'next';
import { Suspense } from 'react';
import { query } from '@/platform/vendure/api';
import {SearchProductsQuery} from '@/features/search/graphql';
import {GetCollectionProductsQuery} from '@/features/collections/graphql';
import {ProductGrid} from '@/features/products/product-grid';
import {FacetFilters} from '@/features/search/facet-filters';
import {ProductGridSkeleton} from '@/features/products/product-grid-skeleton';
import { buildSearchInput, getCurrentPage } from '@/features/search/search-helpers';
import { cacheLife, cacheTag } from 'next/cache';
import { routing } from '@/platform/i18n/routing';
import {
    SITE_NAME,
    truncateDescription,
    buildCanonicalUrl,
    buildOgImages,
} from '@/config/metadata';
import {toOgLocale} from '@/platform/i18n/locale-utils';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {getAllCollections} from '@/features/collections/data';
import {getCollectionPath} from '@/features/collections/paths';
import {redirect} from '@/platform/i18n/navigation';
import {
    CataloguePageHeader,
    CatalogueSidebar,
    StorefrontBreadcrumbs,
    StorefrontPageShell,
} from '@/components/catalogue-page';

async function getCollectionProducts(slug: string, searchParams: { [key: string]: string | string[] | undefined }, currencyCode: string) {
    'use cache';
    cacheLife('hours');

    const locale = await getRouteLocale();
    cacheTag(`collection-${slug}-${locale}-${currencyCode}`);
    cacheTag('collection');

    return query(SearchProductsQuery, {
        input: buildSearchInput({
            searchParams,
            collectionSlug: slug
        })
    }, {languageCode: locale, currencyCode});
}

async function getCollectionMetadata(slug: string) {
    'use cache';
    cacheLife('hours');

    const locale = await getRouteLocale();
    cacheTag(`collection-meta-${slug}-${locale}`);

    return query(GetCollectionProductsQuery, {
        slug,
        input: { take: 0, collectionSlug: slug, groupByProduct: true },
    }, {languageCode: locale});
}

export async function generateCollectionMetadata(slug: string): Promise<Metadata> {
    const locale = await getRouteLocale();
    const result = await getCollectionMetadata(slug);
    const collection = result.data.collection;

    const t = await getTranslations({locale, namespace: 'Collection'});

    if (!collection) {
        return {
            title: t('collectionNotFound'),
        };
    }

    const description = slug === 'featured'
        ? t('featuredDescription')
        : truncateDescription(collection.description) ||
          t('browseCollectionAt', {name: collection.name, siteName: SITE_NAME});
    const ogLocale = toOgLocale(locale);
    const collectionPath = getCollectionPath(collection.slug);

    return {
        title: collection.name,
        description,
        alternates: {
            canonical: buildCanonicalUrl(`/${locale}${collectionPath}`),
            languages: Object.fromEntries(
                routing.locales.map((l) => [l, buildCanonicalUrl(`/${l}${collectionPath}`)])
            ),
        },
        openGraph: {
            title: collection.name,
            description,
            type: 'website',
            locale: ogLocale,
            url: buildCanonicalUrl(`/${locale}${collectionPath}`),
            images: buildOgImages(collection.featuredAsset?.preview, collection.name),
        },
        twitter: {
            card: 'summary_large_image',
            title: collection.name,
            description,
            images: collection.featuredAsset?.preview
                ? [collection.featuredAsset.preview]
                : undefined,
        },
    };
}

export async function generateMetadata({params}: PageProps<'/[locale]/collection/[slug]'>): Promise<Metadata> {
    const {slug} = await params;
    return generateCollectionMetadata(slug);
}

interface CollectionPageContentProps {
    slug: string;
    searchParams: Promise<{[key: string]: string | string[] | undefined}>;
    topLevel?: boolean;
}

export async function CollectionPageContent({slug, searchParams, topLevel = false}: CollectionPageContentProps) {
    const searchParamsResolved = await searchParams;
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({locale, namespace: 'Collection'});
    const page = getCurrentPage(searchParamsResolved);

    const productDataPromise = getCollectionProducts(slug, searchParamsResolved, currencyCode);
    const [collectionResult, categories] = await Promise.all([
        getCollectionMetadata(slug),
        getAllCollections(locale),
    ]);
    const collection = collectionResult.data.collection;
    const collectionName = collection?.name ?? slug;

    return (
        <StorefrontPageShell>
            <CataloguePageHeader
                eyebrow={topLevel ? t('featuredEyebrow') : t('eyebrow')}
                title={collectionName}
                description={topLevel ? t('featuredDescription') : collection?.description ? (
                    <div dangerouslySetInnerHTML={{__html: collection.description}} />
                ) : t('defaultDescription', {name: collectionName})}
                breadcrumbs={topLevel ? undefined : (
                    <StorefrontBreadcrumbs
                        items={[
                            {label: t('home'), href: '/'},
                            {label: t('shopAll'), href: '/search'},
                            {label: collectionName},
                        ]}
                    />
                )}
            />

            <div className="flex flex-col gap-8 lg:flex-row">
                <CatalogueSidebar
                    categories={categories}
                    activeSlug={slug}
                    categoryTitle={t('categories')}
                    allProductsLabel={t('allProducts')}
                    filters={(
                        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
                            <FacetFilters productDataPromise={productDataPromise} />
                        </Suspense>
                    )}
                />

                {/* Product Grid */}
                <div className="min-w-0 flex-1">
                    <Suspense fallback={<ProductGridSkeleton />}>
                        <ProductGrid productDataPromise={productDataPromise} currentPage={page} take={12} />
                    </Suspense>
                </div>
            </div>
        </StorefrontPageShell>
    );
}

export default async function CollectionPage({params, searchParams}: PageProps<'/[locale]/collection/[slug]'>) {
    const {slug} = await params;
    const locale = await getRouteLocale();

    if (slug === 'featured') {
        return redirect({href: '/featured', locale});
    }

    return <CollectionPageContent slug={slug} searchParams={searchParams} />;
}
