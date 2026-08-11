import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Logger } from '@vendure/core';

import { EMBEDDING_DIM, loggerCtx, VISUAL_SEARCH_PLUGIN_OPTIONS } from '../constants';
import { EmbedderHealth, EmbedResponse, EmbedResultItem, VisualSearchPluginOptions } from '../types';

/**
 * HTTP client for the embedding service.
 *
 * This is the only place in the backend that talks to a model. It owns batching,
 * timeouts, and the revision guard; it owns no preprocessing, because that lives
 * inside the embedder by contract (§3.7) so the index and query paths cannot drift.
 *
 * See docs/embedding-service-contract.md.
 */
@Injectable()
export class EmbedderService implements OnApplicationBootstrap {
    private health: EmbedderHealth | undefined;

    constructor(
        @Inject(VISUAL_SEARCH_PLUGIN_OPTIONS)
        private options: VisualSearchPluginOptions,
    ) {}

    /**
     * Fail fast at boot on a dimension mismatch. A vector of the wrong width cannot
     * be stored, but a *right*-width vector from a different model stores fine and
     * yields distances that are arithmetically valid and semantically meaningless.
     * Catching that at startup is much cheaper than debugging "results are bad".
     */
    async onApplicationBootstrap(): Promise<void> {
        try {
            const health = await this.getHealth();
            if (health.embedding_dim !== EMBEDDING_DIM) {
                Logger.error(
                    `Embedder reports embedding_dim=${health.embedding_dim} but this build ` +
                        `expects ${EMBEDDING_DIM}. The migration created vector(${EMBEDDING_DIM}); ` +
                        'writes will fail. Update EMBEDDING_DIM, write a new migration, and reindex.',
                    loggerCtx,
                );
            } else {
                Logger.info(
                    `Embedder ready: ${health.model_id} rev=${health.revision} dim=${health.embedding_dim}`,
                    loggerCtx,
                );
            }
        } catch (e: any) {
            // Not fatal: the store must still serve pages when visual search is down.
            Logger.warn(
                `Embedder unreachable at ${this.options.embedderUrl} (${e.message}). ` +
                    'Visual search will return no results until it is available.',
                loggerCtx,
            );
        }
    }

    async getHealth(force = false): Promise<EmbedderHealth> {
        if (this.health && !force) {
            return this.health;
        }
        const res = await this.fetch('/health', undefined, 'GET');
        this.health = (await res.json()) as EmbedderHealth;
        return this.health;
    }

    /** Current embedder revision — stamped on every row written, and the staleness key. */
    async getRevision(): Promise<string> {
        return (await this.getHealth()).revision;
    }

    /**
     * Embed images. Input order is preserved and per-item failures are returned
     * rather than thrown, so one corrupt asset cannot abort an indexing batch.
     */
    async embedImages(items: Array<{ id: string; data: Buffer }>): Promise<EmbedResultItem[]> {
        const payload = items.map(i => ({ id: i.id, data: i.data.toString('base64') }));
        return this.embed('/embed/images', payload);
    }

    async embedText(items: Array<{ id: string; text: string }>): Promise<EmbedResultItem[]> {
        return this.embed('/embed/text', items);
    }

    private async embed(path: string, items: unknown[]): Promise<EmbedResultItem[]> {
        if (items.length === 0) {
            return [];
        }
        const batchSize = Math.min(this.options.batchSize ?? 32, 32);
        const out: EmbedResultItem[] = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const chunk = items.slice(i, i + batchSize);
            const res = await this.fetch(path, { items: chunk });
            const body = (await res.json()) as EmbedResponse;

            if (body.embedding_dim !== EMBEDDING_DIM) {
                throw new Error(
                    `Embedder returned dim=${body.embedding_dim}, expected ${EMBEDDING_DIM}`,
                );
            }
            out.push(...body.results);
        }
        return out;
    }

    private async fetch(path: string, body?: unknown, method: 'GET' | 'POST' = 'POST') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30_000);
        try {
            const res = await fetch(`${this.options.embedderUrl}${path}`, {
                method,
                headers: body ? { 'content-type': 'application/json' } : undefined,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            if (!res.ok) {
                throw new Error(`embedder ${method} ${path} -> HTTP ${res.status}`);
            }
            return res;
        } finally {
            clearTimeout(timer);
        }
    }
}
