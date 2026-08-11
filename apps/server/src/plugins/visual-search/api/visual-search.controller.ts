import { Controller, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ConfigService,
    LanguageCode,
    ProductVariantService,
    RequestContextService,
    UserInputError,
} from '@vendure/core';
import type { Request } from 'express';

import { EmbedderService } from '../services/embedder.service';
import { VisualSearchService } from '../services/visual-search.service';

const DEFAULT_TAKE = 12;
const MAX_TAKE = 50;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Binary upload path for visual search.
 *
 * The GraphQL `searchByImage` query carries the image as base64 inside a JSON body,
 * which inflates it by ~37% and has to clear three separate body-size limits — the
 * browser, the storefront's server action, and Express. This route takes the raw
 * bytes as multipart instead: no encoding tax, and the request streams rather than
 * being buffered as one large JSON string.
 *
 * The GraphQL query stays. It is the right shape for typed clients and for anything
 * composing image search with other fields; this exists purely because moving several
 * megabytes of photo through JSON is the wrong transport.
 *
 *     POST /visual-search/search?take=12
 *     Content-Type: multipart/form-data,  field name: "image"
 *
 * Note this route is outside `shopApiPath`, so Vendure's Shop API session middleware
 * does not run and `@Ctx()` would be empty. The context is built explicitly below.
 */
@Controller('visual-search')
export class VisualSearchController {
    constructor(
        private requestContextService: RequestContextService,
        private visualSearch: VisualSearchService,
        private embedder: EmbedderService,
        private configService: ConfigService,
        private productVariantService: ProductVariantService,
    ) {}

    @Post('search')
    @UseInterceptors(
        FileInterceptor('image', {
            limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
        }),
    )
    async search(
        @Req() request: Request,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Query('take') take?: string,
        @Query('languageCode') languageCode?: string,
    ) {
        if (!file?.buffer?.length) {
            throw new UserInputError('an image file is required in the "image" field');
        }
        if (!file.mimetype?.startsWith('image/')) {
            throw new UserInputError(`expected an image, received ${file.mimetype}`);
        }

        const ctx = await this.requestContextService.create({
            apiType: 'shop',
            languageCode: languageCode as LanguageCode | undefined,
        });

        const hits = await this.visualSearch.searchByImage(ctx, file.buffer, clampTake(take));

        // Variants are fetched per product rather than as a relation. `priceWithTax` is
        // not a stored column — it is computed at runtime by applyChannelPriceAndTax,
        // which getVariantsByProductId applies. Loading `variants` as a plain relation
        // returns rows with no price at all, which is why the first REST response came
        // back with an empty variants array.
        const variantsByProduct = new Map(
            await Promise.all(
                hits.map(async hit => {
                    const list = await this.productVariantService.getVariantsByProductId(
                        ctx,
                        hit.product.id,
                    );
                    return [String(hit.product.id), list.items] as const;
                }),
            ),
        );

        return {
            revision: await this.embedder.getRevision(),
            items: hits.map(hit => ({
                distance: hit.distance,
                matchedAssetId: hit.assetId,
                product: {
                    id: hit.product.id,
                    name: hit.product.name,
                    slug: hit.product.slug,
                    featuredAsset: hit.product.featuredAsset
                        ? {
                              id: hit.product.featuredAsset.id,
                              // The stored value is a storage identifier, not a URL.
                              // GraphQL runs it through the asset server's
                              // toAbsoluteUrl; serializing the entity directly would
                              // hand the browser "preview/34/foo.jpg" and break every
                              // thumbnail.
                              preview: this.absoluteAssetUrl(
                                  request,
                                  hit.product.featuredAsset.preview,
                              ),
                          }
                        : null,
                    variants: (variantsByProduct.get(String(hit.product.id)) ?? []).map(v => ({
                        id: v.id,
                        priceWithTax: v.priceWithTax,
                        currencyCode: v.currencyCode,
                    })),
                },
            })),
        };
    }

    /** Delegates to whatever asset storage strategy is configured, as GraphQL does. */
    private absoluteAssetUrl(request: Request, identifier: string): string {
        const strategy = this.configService.assetOptions.assetStorageStrategy;
        return strategy.toAbsoluteUrl
            ? strategy.toAbsoluteUrl(request, identifier)
            : identifier;
    }
}

function clampTake(raw?: string): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_TAKE;
    }
    return Math.min(Math.floor(parsed), MAX_TAKE);
}
