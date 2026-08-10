import {graphql} from '@/platform/vendure/graphql';

/**
 * Fields needed to render a visual-search hit.
 *
 * Not reusing ProductCardFragment: that fragment is `on SearchResult` (Vendure's
 * built-in text search), whereas VisualSearchHit.product is a plain `Product`.
 * Different types, so a dedicated fragment is required.
 */
export const VisualSearchCardFragment = graphql(`
    fragment VisualSearchCard on Product {
        id
        name
        slug
        featuredAsset {
            id
            preview
        }
        variants {
            id
            priceWithTax
            currencyCode
        }
    }
`);

export const SearchByImageQuery = graphql(
    `
        query SearchByImage($image: String!, $take: Int) {
            searchByImage(image: $image, take: $take) {
                revision
                items {
                    distance
                    matchedAssetId
                    product {
                        ...VisualSearchCard
                    }
                }
            }
        }
    `,
    [VisualSearchCardFragment],
);
