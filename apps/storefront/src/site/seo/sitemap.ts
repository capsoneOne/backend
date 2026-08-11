import type {MetadataRoute} from 'next';
import {query} from '@/platform/vendure/api';
import {routing} from '@/platform/i18n/routing';
import {buildCanonicalUrl} from '@/config/metadata';
import {SitemapCollectionsQuery, SitemapProductsQuery} from '@/site/seo/graphql';

/** Vendure caps `take` at 100 by default; page through rather than guess a ceiling. */
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/** Locale alternates, so one entry covers every language of the same page. */
function withAlternates(path: string): Pick<MetadataRoute.Sitemap[number], 'url' | 'alternates'> {
    return {
        url: buildCanonicalUrl(path),
        alternates: {
            languages: Object.fromEntries(
                routing.locales.map(locale => [locale, buildCanonicalUrl(`/${locale}${path}`)]),
            ),
        },
    };
}

async function allProducts() {
    const slugs: Array<{slug: string; updatedAt: string}> = [];
    for (let page = 0; page < MAX_PAGES; page++) {
        const result = await query(SitemapProductsQuery, {
            options: {take: PAGE_SIZE, skip: page * PAGE_SIZE},
        });
        const {items, totalItems} = result.data.products;
        slugs.push(...items);
        if (slugs.length >= totalItems || items.length === 0) break;
    }
    return slugs;
}

/**
 * Every indexable URL in the storefront.
 *
 * Account, cart, checkout and visual-search are deliberately absent: they are
 * either private, transient, or (in visual search's case) meaningless without an
 * uploaded image, which is why that route already returns `noindex`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticPaths = [
        {path: '/', priority: 1, changeFrequency: 'daily' as const},
        {path: '/search', priority: 0.9, changeFrequency: 'daily' as const},
        {path: '/collections', priority: 0.8, changeFrequency: 'weekly' as const},
        {path: '/about', priority: 0.4, changeFrequency: 'yearly' as const},
        {path: '/contact', priority: 0.4, changeFrequency: 'yearly' as const},
        {path: '/help', priority: 0.5, changeFrequency: 'monthly' as const},
        {path: '/shipping-returns', priority: 0.4, changeFrequency: 'yearly' as const},
        {path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const},
        {path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const},
    ];

    const entries: MetadataRoute.Sitemap = staticPaths.map(({path, priority, changeFrequency}) => ({
        ...withAlternates(path),
        changeFrequency,
        priority,
    }));

    // A sitemap that throws takes the whole route down. A catalogue-less sitemap
    // is still a valid sitemap, so fall back to the static entries.
    try {
        const [products, collections] = await Promise.all([
            allProducts(),
            query(SitemapCollectionsQuery, {options: {take: PAGE_SIZE}}),
        ]);

        for (const collection of collections.data.collections.items) {
            entries.push({
                ...withAlternates(`/collection/${collection.slug}`),
                changeFrequency: 'weekly',
                priority: 0.7,
            });
        }

        for (const product of products) {
            entries.push({
                ...withAlternates(`/product/${product.slug}`),
                lastModified: new Date(product.updatedAt),
                changeFrequency: 'weekly',
                priority: 0.6,
            });
        }
    } catch (error) {
        console.error('sitemap: catalogue unavailable, serving static routes only', error);
    }

    return entries;
}
