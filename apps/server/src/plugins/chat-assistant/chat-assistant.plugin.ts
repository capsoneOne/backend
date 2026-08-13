import {PluginCommonModule, VendurePlugin} from '@vendure/core';

import {chatAssistantShopApiExtensions} from './api-extensions';
import {ChatAssistantShopResolver} from './chat-assistant.resolver';
import {ChatAssistantService} from './chat-assistant.service';
import {CHAT_ASSISTANT_OPTIONS} from './constants';
import type {ChatAssistantPluginOptions} from './types';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        ChatAssistantService,
        {provide: CHAT_ASSISTANT_OPTIONS, useFactory: () => ChatAssistantPlugin.options},
    ],
    shopApiExtensions: {
        schema: chatAssistantShopApiExtensions,
        resolvers: [ChatAssistantShopResolver],
    },
    compatibility: '^3.0.0',
})
export class ChatAssistantPlugin {
    static options: ChatAssistantPluginOptions;

    static init(options: ChatAssistantPluginOptions): typeof ChatAssistantPlugin {
        this.options = options;
        return ChatAssistantPlugin;
    }
}

