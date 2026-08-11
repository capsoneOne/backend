import { OnApplicationBootstrap } from '@nestjs/common';
import {
    EventBus,
    PluginCommonModule,
    ProductEvent,
    VendurePlugin,
} from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { VisualSearchController } from './api/visual-search.controller';
import { VisualSearchAdminResolver, VisualSearchShopResolver } from './api/visual-search.resolver';
import { VISUAL_SEARCH_PLUGIN_OPTIONS } from './constants';
import { ProductAssetEmbedding } from './entities/product-asset-embedding.entity';
import { EmbedderService } from './services/embedder.service';
import { VisualSearchService } from './services/visual-search.service';
import { VisualSearchPluginOptions } from './types';

/**
 * Image-based product search backed by pgvector.
 *
 * The model itself lives behind an HTTP boundary (services/embedder) so it can be
 * swapped without touching this plugin. See docs/embedding-service-contract.md.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [ProductAssetEmbedding],
    // Binary upload path. Lives outside the Shop API because multipart does not
    // belong in a GraphQL JSON body — see the controller for the reasoning.
    controllers: [VisualSearchController],
    providers: [
        EmbedderService,
        VisualSearchService,
        { provide: VISUAL_SEARCH_PLUGIN_OPTIONS, useFactory: () => VisualSearchPlugin.options },
    ],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [VisualSearchShopResolver],
    },
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [VisualSearchAdminResolver],
    },
    compatibility: '^3.0.0',
})
export class VisualSearchPlugin implements OnApplicationBootstrap {
    static options: VisualSearchPluginOptions;

    static init(options: VisualSearchPluginOptions): typeof VisualSearchPlugin {
        this.options = options;
        return VisualSearchPlugin;
    }

    constructor(
        private eventBus: EventBus,
        private visualSearch: VisualSearchService,
    ) {}

    /**
     * Re-embed a product whenever it changes. Assets are edited through the product,
     * so a ProductEvent is the reliable trigger; the work is queued, never inline,
     * so saving a product in the Dashboard is never blocked on inference.
     */
    onApplicationBootstrap(): void {
        this.eventBus.ofType(ProductEvent).subscribe(event => {
            if (event.type === 'deleted') {
                return;
            }
            void this.visualSearch.enqueueProduct(event.entity.id);
        });
    }
}
