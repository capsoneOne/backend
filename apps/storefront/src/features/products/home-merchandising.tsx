import {cacheLife, cacheTag} from 'next/cache';
import {getTranslations} from 'next-intl/server';

import {GetCollectionProductsQuery} from '@/features/collections/graphql';
import {getCollectionPath} from '@/features/collections/paths';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {GetNewestProductsQuery} from '@/features/products/graphql';
import {getRouteLocale} from '@/platform/i18n/server';
import {query} from '@/platform/vendure/api';
import {MerchandiseProductCarousel} from './components/merchandise-product-carousel';
import {ProductCarousel} from './components/product-carousel';
import {
    StorefrontSectionHeader,
    StorefrontSectionLink,
    storefrontSectionClass,
} from '@/components/storefront-section';

const SALE_COLLECTION_SLUG = process.env.NEXT_PUBLIC_SALE_COLLECTION_SLUG ?? 'sale';

async function getNewestProducts(locale: string, currencyCode: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`new-arrivals-${locale}-${currencyCode}`);
    cacheTag('products');

    const result = await query(
        GetNewestProductsQuery,
        {options: {take: 12, sort: {createdAt: 'DESC'}}},
        {languageCode: locale, currencyCode},
    );
    return result.data.products.items;
}

async function getSaleProducts(locale: string, currencyCode: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`home-sale-${SALE_COLLECTION_SLUG}-${locale}-${currencyCode}`);
    cacheTag('collection');
    cacheTag('products');

    return query(
        GetCollectionProductsQuery,
        {
            slug: SALE_COLLECTION_SLUG,
            input: {
                collectionSlug: SALE_COLLECTION_SLUG,
                take: 12,
                skip: 0,
                groupByProduct: true,
                sort: {price: 'ASC'},
            },
        },
        {languageCode: locale, currencyCode},
    );
}

export async function NewArrivalsSection() {
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({locale, namespace: 'Product'});
    const products = await getNewestProducts(locale, currencyCode);

    if (products.length === 0) return null;

    const labels = {
        new: t('newBadge'),
        soldOut: t('soldOut'),
        noImage: t('noImage'),
        from: t('from'),
    };

    return (
        <section className={`reveal-section ${storefrontSectionClass} bg-secondary/15`}>
            <div className="container mx-auto px-4">
                <StorefrontSectionHeader
                    eyebrow={t('newArrivalsEyebrow')}
                    title={t('newArrivals')}
                    description={t('newArrivalsDescription')}
                    href="/search"
                    linkLabel={t('browseAll')}
                />

                <MerchandiseProductCarousel products={products} labels={labels}/>

                <div className="mt-8 flex justify-center md:hidden">
                    <StorefrontSectionLink href="/search">{t('browseAll')}</StorefrontSectionLink>
                </div>
            </div>
        </section>
    );
}

export async function SaleSection() {
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({locale, namespace: 'Product'});
    const result = await getSaleProducts(locale, currencyCode).catch(() => null);
    const collection = result?.data.collection;
    const products = result?.data.search.items ?? [];
    const description = collection?.description.replace(/<[^>]*>/g, '').trim();

    // Sale is merchandising data, not a hard-coded discount claim. Publishing a
    // collection with the configured slug turns the rail on; removing it turns it off.
    if (!collection || products.length === 0) return null;

    return (
        <div className="reveal-section border-b border-border bg-background">
            <ProductCarousel
                eyebrow={t('saleEyebrow')}
                title={collection.name || t('saleTitle')}
                description={description || t('saleDescription')}
                products={products}
                href={getCollectionPath(collection.slug)}
                linkLabel={t('shopSale')}
                badgeLabel={t('saleBadge')}
            />
        </div>
    );
}
