import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, Permission, RequestContext, UserInputError } from '@vendure/core';

import { ContactMessageStatus } from '../entities/contact-message.entity';
import { ContactService, SubmitContactMessageInput } from '../services/contact.service';

const STATUSES: ContactMessageStatus[] = ['new', 'read', 'archived'];

@Resolver()
export class ContactShopResolver {
    constructor(private contact: ContactService) {}

    @Mutation()
    async submitContactMessage(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: SubmitContactMessageInput },
    ) {
        // Attributing the message to the signed-in customer costs nothing here and
        // saves an operator matching a name to an account by hand later.
        const customerId = await this.contact.resolveCustomerId(ctx);
        return this.contact.submit(ctx, args.input, customerId);
    }
}

@Resolver()
export class ContactAdminResolver {
    constructor(private contact: ContactService) {}

    @Query()
    @Allow(Permission.ReadCustomer)
    async contactMessages(
        @Ctx() ctx: RequestContext,
        @Args() args: { options?: { skip?: number; take?: number; status?: string } },
    ) {
        return this.contact.findAll(ctx, args.options ?? {});
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    async setContactMessageStatus(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID; status: string },
    ) {
        if (!STATUSES.includes(args.status as ContactMessageStatus)) {
            throw new UserInputError(`status must be one of: ${STATUSES.join(', ')}`);
        }
        return this.contact.setStatus(ctx, args.id, args.status as ContactMessageStatus);
    }
}
