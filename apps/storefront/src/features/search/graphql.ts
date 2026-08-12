import {graphql} from '@/platform/vendure/graphql';
import {ProductCardFragment} from '@/features/products/graphql';

export const SearchProductsQuery = graphql(`
    query SearchProducts($input: SearchInput!) {
        search(input: $input) {
            totalItems
            items {
                ...ProductCard
            }
            facetValues {
                count
                facetValue {
                    id
                    name
                    facet {
                        id
                        name
                    }
                }
            }
        }
    }
`, [ProductCardFragment]);

/** Lightweight autocomplete lookup — enough to render a suggestion row. */
export const SearchSuggestionsQuery = graphql(`
    query SearchSuggestions($input: SearchInput!) {
        search(input: $input) {
            totalItems
            items {
                productId
                productName
                slug
                productAsset {
                    id
                    preview
                }
                priceWithTax {
                    __typename
                    ... on PriceRange {
                        min
                    }
                    ... on SinglePrice {
                        value
                    }
                }
                currencyCode
            }
        }
    }
`);
