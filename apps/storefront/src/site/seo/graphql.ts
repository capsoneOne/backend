import {graphql} from '@/platform/vendure/graphql';

/** Slugs only — the sitemap needs URLs and timestamps, nothing else. */
export const SitemapProductsQuery = graphql(`
    query SitemapProducts($options: ProductListOptions) {
        products(options: $options) {
            totalItems
            items {
                slug
                updatedAt
            }
        }
    }
`);

export const SitemapCollectionsQuery = graphql(`
    query SitemapCollections($options: CollectionListOptions) {
        collections(options: $options) {
            totalItems
            items {
                slug
                updatedAt
            }
        }
    }
`);
