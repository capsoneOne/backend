import { OnApplicationBootstrap } from '@nestjs/common';
import { Logger, PluginCommonModule, VendurePlugin } from '@vendure/core';

import { shopApiExtensions } from './api/api-extensions';
import { PayWayController } from './api/payway.controller';
import { PayWayShopResolver } from './api/payway.resolver';
import { PAYWAY_PLUGIN_OPTIONS, loggerCtx } from './constants';
import { paywayPaymentHandler } from './payway.handler';
import { PayWayService } from './payway.service';
import { PayWayPluginOptions } from './types';

/**
 * ABA KHQR payments via PayWay.
 *
 * PayWay replaced Stripe, which cannot be activated for a Cambodian business and so
 * could never take a payment here. PayWay is ABA's own gateway rather than a reseller
 * in front of it, and covers both rails the storefront needs: KHQR for bank apps and
 * cards for everyone else. Two PaymentMethods share this one handler and the
 * storefront picks between them on the method code.
 *
 * Without a merchant id and API key the plugin loads and does nothing, so a clone
 * with no ABA account still boots and still checks out through the other methods.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [PayWayController],
    providers: [
        PayWayService,
        { provide: PAYWAY_PLUGIN_OPTIONS, useFactory: () => PayWayPlugin.options },
    ],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [PayWayShopResolver],
    },
    compatibility: '^3.0.0',
    configuration: config => {
        config.paymentOptions.paymentMethodHandlers.push(paywayPaymentHandler);
        return config;
    },
})
export class PayWayPlugin implements OnApplicationBootstrap {
    static options: PayWayPluginOptions;

    static init(options: PayWayPluginOptions): typeof PayWayPlugin {
        this.options = options;
        return PayWayPlugin;
    }

    constructor(private payway: PayWayService) {}

    onApplicationBootstrap(): void {
        if (!this.payway.isConfigured) {
            Logger.info('PayWay KHQR payments disabled (no merchant id or API key)', loggerCtx);
            return;
        }
        const { environment } = PayWayPlugin.options;
        if (environment === 'production') {
            // Loud on purpose. The difference between the two environments is whether
            // real money moves, and it is one environment variable wide.
            Logger.warn('PayWay KHQR payments enabled against PRODUCTION — real money', loggerCtx);
        } else {
            Logger.info('PayWay KHQR payments enabled (sandbox)', loggerCtx);
        }
    }
}
