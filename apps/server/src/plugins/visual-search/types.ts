export interface VisualSearchPluginOptions {
    /** Base URL of the embedding service, e.g. http://localhost:8100 */
    embedderUrl: string;
    /** Per-request item cap. Must not exceed the embedder's MAX_BATCH_ITEMS (32). */
    batchSize?: number;
    /** Request timeout in ms. Indexing batches are slower than single queries. */
    timeoutMs?: number;
    /** Max decoded bytes accepted for a query image, before base64 encoding. */
    maxQueryImageBytes?: number;
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
