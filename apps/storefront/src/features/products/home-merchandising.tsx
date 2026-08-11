import {cacheLife, cacheTag} from 'next/cache';
import {ArrowRight} from 'lucide-react';
import {getTranslations} from 'next-intl/server';

import {GetCollectionProductsQuery} from '@/features/collections/graphql';
import {getCollectionPath} from '@/features/collections/paths';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {GetNewestProductsQuery} from '@/features/products/graphql';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {query} from '@/platform/vendure/api';
import {MerchandiseProductCarousel} from './components/merchandise-product-carousel';
import {ProductCarousel} from './components/product-carousel';

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
        <section className="reveal-section border-b border-border py-16 md:py-24">
            <div className="container mx-auto px-4">
                <div className="mb-10 flex items-end justify-between gap-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                            {t('newArrivalsEyebrow')}
                        </p>
                        <h2 className="mt-3 text-3xl font-bold md:text-4xl">{t('newArrivals')}</h2>
                        <p className="mt-3 max-w-xl font-light text-muted-foreground">
                            {t('newArrivalsDescription')}
                        </p>
                    </div>
                    <Link href="/search" className="hidden items-center gap-2 text-sm font-medium text-primary hover:underline md:flex">
                        {t('browseAll')}
                        <ArrowRight className="size-4"/>
                    </Link>
                </div>

                <MerchandiseProductCarousel products={products} labels={labels}/>

                <Link href="/search" className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline md:hidden">
                    {t('browseAll')}
                    <ArrowRight className="size-4"/>
                </Link>
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
        <div className="reveal-section border-b border-border bg-secondary/30">
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
