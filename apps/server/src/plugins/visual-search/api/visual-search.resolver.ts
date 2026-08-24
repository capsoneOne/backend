import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext, UserInputError } from '@vendure/core';

import { VisualSearchService } from '../services/visual-search.service';
import { EmbedderService } from '../services/embedder.service';

const DEFAULT_TAKE = 12;
const MAX_TAKE = 50;

@Resolver()
export class VisualSearchShopResolver {
    constructor(
        private visualSearch: VisualSearchService,
        private embedder: EmbedderService,
    ) {}

    @Query()
    async searchByImage(
        @Ctx() ctx: RequestContext,
        @Args() args: { image: string; take?: number },
    ) {
        const image = this.decodeImage(args.image);
        const items = await this.visualSearch.searchByImage(ctx, image, clampTake(args.take));
        return { items: items.map(toHit), revision: await this.embedder.getRevision() };
    }

    @Query()
    async searchByDescription(
        @Ctx() ctx: RequestContext,
        @Args() args: { text: string; take?: number },
    ) {
        if (!args.text?.trim()) {
            throw new UserInputError('text must not be empty');
        }
        const items = await this.visualSearch.searchByText(ctx, args.text, clampTake(args.take));
        return { items: items.map(toHit), revision: await this.embedder.getRevision() };
    }

    /**
     * Accepts a bare base64 string or a data URL, since a browser's FileReader
     * produces the latter and stripping it client-side is easy to forget.
     */
    private decodeImage(input: string): Buffer {
        const base64 = input.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        if (!base64) {
            throw new UserInputError('image must not be empty');
        }
        let buffer: Buffer;
        try {
            buffer = Buffer.from(base64, 'base64');
        } catch {
            throw new UserInputError('image is not valid base64');
        }
        if (buffer.length === 0) {
            throw new UserInputError('image decoded to zero bytes');
        }
        return buffer;
    }
}

@Resolver()
export class VisualSearchAdminResolver {
    constructor(private visualSearch: VisualSearchService) {}

    @Query()
    @Allow(Permission.ReadCatalog)
    async visualSearchIndexStatus(@Ctx() ctx: RequestContext) {
        return this.visualSearch.getIndexStatus(ctx);
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    async visualSearchEmbedderHealth() {
        return this.visualSearch.getEmbedderHealth();
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async reindexVisualSearch(
        @Ctx() ctx: RequestContext,
        @Args() args: { onlyMissing?: boolean },
    ) {
        return this.visualSearch.reindexAll(ctx, args.onlyMissing ?? false);
    }
}

function clampTake(take?: number): number {
    if (take == null) {
        return DEFAULT_TAKE;
    }
    return Math.max(1, Math.min(take, MAX_TAKE));
}

function toHit(hit: { product: unknown; distance: number; assetId: unknown }) {
    return { product: hit.product, distance: hit.distance, matchedAssetId: hit.assetId };
}
