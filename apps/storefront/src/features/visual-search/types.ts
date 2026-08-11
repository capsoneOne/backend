/**
 * Shapes returned by the visual-search REST endpoint.
 *
 * These are hand-written rather than derived from the GraphQL schema, because the
 * upload path is multipart REST — moving several megabytes of photo through a JSON
 * body was the wrong transport. The GraphQL `searchByImage` query still exists on the
 * Shop API for typed clients; the storefront just no longer uses it for uploads.
 */

export type VisualSearchErrorCode =
    // raised in the browser, before anything is sent
    | 'NOT_IMAGE'
    | 'TOO_LARGE'
    | 'READ_FAILED'
    // raised by the route handler or upstream
    | 'EMPTY'
    | 'UNAVAILABLE'
    | 'FAILED';

export interface VisualSearchProduct {
    id: string;
    name: string;
    slug: string;
    featuredAsset: {id: string; preview: string} | null;
    variants: Array<{id: string; priceWithTax: number; currencyCode: string}>;
}

export interface VisualSearchHit {
    distance: number;
    matchedAssetId: string;
    product: VisualSearchProduct;
}

export interface VisualSearchResponse {
    /** Which embedder produced these vectors. Shown in the UI deliberately. */
    revision: string;
    items: VisualSearchHit[];
}

export type VisualSearchState =
    | {status: 'idle'}
    | {status: 'error'; code: VisualSearchErrorCode}
    | {status: 'ok'; result: VisualSearchResponse};
