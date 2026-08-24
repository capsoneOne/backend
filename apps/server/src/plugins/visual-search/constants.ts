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

/**
 * Marker the embedder puts in its revision string when it could not reach the model hub
 * to resolve a commit sha (services/embedder/app/model_openclip.py).
 *
 * Such a revision is safe to *query* with — the vectors are real — but must never be
 * stamped onto a full index: the next start that does reach the hub resolves the true
 * sha, and because search filters on revision, every row written under the unpinned
 * identity becomes invisible in one restart. The two sides agree on this literal by
 * convention, not by contract, so keep them in step.
 */
export const UNPINNED_REVISION_MARKER = '-unpinned-';
