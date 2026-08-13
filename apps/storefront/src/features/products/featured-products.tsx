import {cacheLife, cacheTag} from 'next/cache';
import {getTranslations} from 'next-intl/server';

import {GetCollectionProductsQuery} from '@/features/collections/graphql';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {ProductCarousel} from '@/features/products/components/product-carousel';
import {getRouteLocale} from '@/platform/i18n/server';
import {query} from '@/platform/vendure/api';

async function getFeaturedCollectionProducts(locale: string, currencyCode: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`featured-${locale}-${currencyCode}`);
    cacheTag('collection');
    cacheTag('products');

    const result = await query(GetCollectionProductsQuery, {
        slug: 'featured',
        input: {
            collectionSlug: 'featured',
            take: 12,
            skip: 0,
            groupByProduct: true,
            // Vendure otherwise returns the oldest seeded fashion products first.
            // A stable name sort keeps this mixed-category edit balanced on reruns.
            sort: {name: 'ASC'},
        },
    }, {languageCode: locale, currencyCode});

    return result.data.search.items;
}

export async function FeaturedProducts() {
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({locale, namespace: 'Product'});
    const products = await getFeaturedCollectionProducts(locale, currencyCode).catch(() => []);

    if (products.length === 0) return null;

    return (
        <div className="reveal-section border-b border-border bg-background">
            <ProductCarousel
                eyebrow={t('featuredEyebrow')}
                title={t('featuredProducts')}
                description={t('featuredDescription')}
                products={products}
                href="/featured"
                linkLabel={t('viewFeatured')}
            />
        </div>
    );
}
