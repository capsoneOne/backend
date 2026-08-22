export interface VisualSearchPluginOptions {
    /** Base URL of the embedding service, e.g. http://localhost:8100 */
    embedderUrl: string;
    /** Per-request item cap. Must not exceed the embedder's MAX_BATCH_ITEMS (32). */
    batchSize?: number;
    /** Request timeout in ms for a single-item request — the user-facing query path. */
    timeoutMs?: number;
    /**
     * Added to the timeout per item on a multi-item request.
     *
     * The query path and the index path share one HTTP client but have opposite
     * deadlines: a query sits in a page load and should give up quickly, while a
     * 32-image batch on a 2-vCPU host legitimately takes a minute and has nobody
     * waiting on it. One flat timeout cannot serve both, so batches scale.
     */
    perItemTimeoutMs?: number;
    /** Max decoded bytes accepted for a query image, before base64 encoding. */
    maxQueryImageBytes?: number;
    /**
     * Deadline for reading one source image out of asset storage.
     *
     * Object storage can stop answering without ever failing. The read is awaited
     * inside the indexing loop, so a single hung fetch parks that job forever, and
     * four of them saturate the job queue's concurrency and halt the whole reindex
     * with no error, no failed job, and no log line.
     */
    assetReadTimeoutMs?: number;
}

/** GET /health — the embedder's declaration of what it is. */
export interface EmbedderHealth {
    status: string;
    model_id: string;
    embedding_dim: number;
    revision: string;
    normalized: boolean;
    modalities: string[];
    shared_space: boolean;
}

export interface EmbedResultItem {
    id: string;
    vector: number[] | null;
    error: { code: string; message: string } | null;
}

export interface EmbedResponse {
    model_id: string;
    embedding_dim: number;
    revision: string;
    results: EmbedResultItem[];
}
