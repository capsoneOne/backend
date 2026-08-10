export const loggerCtx = 'VisualSearchPlugin';

/** DI token for the plugin's init options. */
export const VISUAL_SEARCH_PLUGIN_OPTIONS = Symbol('VISUAL_SEARCH_PLUGIN_OPTIONS');

/** Job queue that embeds a product's assets in the background. */
export const INDEX_PRODUCT_QUEUE = 'visual-search-index-product';

/**
 * Vector width of the `embedding` column.
 *
 * This is baked into the migration as `vector(N)` — changing it requires a new
 * migration AND a full reindex, so it is a constant rather than an option.
 * Confirm against GET /health on the embedder before the first index run;
 * the service refuses to start if they disagree.
 */
export const EMBEDDING_DIM = 512;
