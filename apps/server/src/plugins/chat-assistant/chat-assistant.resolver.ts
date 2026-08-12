import {Args, Mutation, Resolver} from '@nestjs/graphql';
import {Ctx, RequestContext} from '@vendure/core';

import {ChatAssistantService} from './chat-assistant.service';

@Resolver()
export class ChatAssistantShopResolver {
    constructor(private chatAssistant: ChatAssistantService) {}

    @Mutation()
    askChatAssistant(
        @Ctx() ctx: RequestContext,
        @Args() args: {
            message: string;
            history?: Array<{role: string; content: string}>;
            clientId?: string;
        },
    ) {
        return this.chatAssistant.ask(ctx, args.message, args.history, args.clientId);
    }
}
