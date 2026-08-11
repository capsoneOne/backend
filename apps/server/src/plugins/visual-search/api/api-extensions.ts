import gql from 'graphql-tag';

/**
 * The image arrives as a base64 String rather than the `Upload` scalar because the
 * storefront's transport is a plain JSON POST (apps/storefront/src/platform/vendure/api.ts)
 * and has no multipart support. Base64 costs ~33% payload overhead, which is
 * acceptable for a single query image and keeps the storefront client unchanged.
 */
export const shopApiExtensions = gql`
    type VisualSearchHit {
        product: Product!
        "Cosine distance in [0, 2]. Lower is more similar."
        distance: Float!
        "The product image that actually matched."
        matchedAssetId: ID!
    }

    type VisualSearchResult {
        items: [VisualSearchHit!]!
        "Echoed so a client can tell which model produced these results."
        revision: String!
    }

    extend type Query {
        "Find visually similar products from a base64-encoded image."
        searchByImage(image: String!, take: Int): VisualSearchResult!

        "Find products from a text description. Requires a model with a shared image/text space."
        searchByDescription(text: String!, take: Int): VisualSearchResult!
    }
`;

export const adminApiExtensions = gql`
    type VisualSearchIndexStatus {
        revision: String!
        modelId: String!
        "Embeddings on the live revision."
        current: Int!
        "Embeddings stranded on an older revision. Non-zero means a reindex is due."
        stale: Int!
        "Distinct products currently searchable."
        products: Int!
    }

    extend type Query {
        visualSearchIndexStatus: VisualSearchIndexStatus!
    }

    extend type Mutation {
        "Queue every product for re-embedding. Returns the number of jobs queued."
        reindexVisualSearch: Int!
    }
`;
