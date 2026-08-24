import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { ContactAdminResolver, ContactShopResolver } from './api/contact.resolver';
import { CONTACT_PLUGIN_OPTIONS } from './constants';
import { ContactMessage } from './entities/contact-message.entity';
import { ContactService } from './services/contact.service';
import { ContactPluginOptions } from './types';

/**
 * Storefront contact form intake.
 *
 * Messages are persisted rather than emailed. See the entity for why: outbound mail
 * is not configured, so the database is the only place a message can survive.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [ContactMessage],
    providers: [
        ContactService,
        { provide: CONTACT_PLUGIN_OPTIONS, useFactory: () => ContactPlugin.options },
    ],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [ContactShopResolver],
    },
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [ContactAdminResolver],
    },
    compatibility: '^3.0.0',
    dashboard: './dashboard/index.tsx',
})
export class ContactPlugin {
    static options: ContactPluginOptions;

    static init(options: ContactPluginOptions): typeof ContactPlugin {
        this.options = options;
        return ContactPlugin;
    }
}
