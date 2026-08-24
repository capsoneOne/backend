import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import {
    CustomerService,
    ID,
    RequestContext,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';

import {
    CLIENT_IP_HEADER,
    CONTACT_PLUGIN_OPTIONS,
    CONTACT_TOPICS,
    MAX_EMAIL_LENGTH,
    MAX_MESSAGE_LENGTH,
    MAX_NAME_LENGTH,
    MAX_ORDER_CODE_LENGTH,
} from '../constants';
import { ContactMessage, ContactMessageStatus } from '../entities/contact-message.entity';
import { ContactPluginOptions } from '../types';

export interface SubmitContactMessageInput {
    name: string;
    email: string;
    topic: string;
    orderCode?: string | null;
    message: string;
}

export type SubmitOutcome =
    | { success: true }
    | { success: false; errorCode: 'RATE_LIMITED' | 'INVALID' };

// Deliberately permissive. Address validation is a well-known tar pit, and the
// cost of rejecting a real address here is a sender who cannot reach us at all.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class ContactService {
    constructor(
        private connection: TransactionalConnection,
        private customerService: CustomerService,
        @Inject(CONTACT_PLUGIN_OPTIONS) private options: ContactPluginOptions,
    ) {}

    /**
     * The active user is an administrator-or-customer User; only the latter has a
     * Customer record, so an admin submitting the form simply goes unattributed.
     */
    async resolveCustomerId(ctx: RequestContext): Promise<ID | null> {
        if (!ctx.activeUserId) return null;
        const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
        return customer?.id ?? null;
    }

    async submit(
        ctx: RequestContext,
        input: SubmitContactMessageInput,
        customerId: ID | null,
    ): Promise<SubmitOutcome> {
        const name = input.name?.trim() ?? '';
        const email = input.email?.trim().toLowerCase() ?? '';
        const message = input.message?.trim() ?? '';
        const orderCode = input.orderCode?.trim() || null;
        const topic = input.topic?.trim() ?? '';

        if (
            !name ||
            !email ||
            !message ||
            name.length > MAX_NAME_LENGTH ||
            email.length > MAX_EMAIL_LENGTH ||
            message.length > MAX_MESSAGE_LENGTH ||
            (orderCode !== null && orderCode.length > MAX_ORDER_CODE_LENGTH) ||
            !EMAIL_PATTERN.test(email) ||
            !CONTACT_TOPICS.includes(topic as (typeof CONTACT_TOPICS)[number])
        ) {
            return { success: false, errorCode: 'INVALID' };
        }

        const submitterHash = this.hashSubmitter(ctx);
        if (await this.isRateLimited(ctx, submitterHash)) {
            return { success: false, errorCode: 'RATE_LIMITED' };
        }

        await this.connection.getRepository(ctx, ContactMessage).save(
            new ContactMessage({
                name,
                email,
                topic,
                orderCode,
                message,
                customerId,
                status: 'new',
                submitterHash,
            }),
        );

        return { success: true };
    }

    async findAll(
        ctx: RequestContext,
        options: { skip?: number; take?: number; status?: string | null } = {},
    ): Promise<{ items: ContactMessage[]; totalItems: number }> {
        const take = Math.min(Math.max(options.take ?? 25, 1), 100);
        const skip = Math.max(options.skip ?? 0, 0);

        const query = this.connection
            .getRepository(ctx, ContactMessage)
            .createQueryBuilder('m')
            // Newest first: this list is a queue to work through, not an archive.
            .orderBy('m.createdAt', 'DESC')
            .skip(skip)
            .take(take);

        if (options.status) {
            query.where('m.status = :status', { status: options.status });
        }

        const [items, totalItems] = await query.getManyAndCount();
        return { items, totalItems };
    }

    async setStatus(
        ctx: RequestContext,
        id: ID,
        status: ContactMessageStatus,
    ): Promise<ContactMessage> {
        const repository = this.connection.getRepository(ctx, ContactMessage);
        const existing = await repository.findOne({ where: { id: id as never } });
        if (!existing) {
            throw new UserInputError(`No contact message with id ${String(id)}`);
        }
        existing.status = status;
        return repository.save(existing);
    }

    /**
     * Counts this sender's recent rows rather than keeping a separate counter table.
     * The messages are the log, so a dedicated bucket would be a second source of
     * truth to keep in step for no gain at this volume.
     */
    private async isRateLimited(ctx: RequestContext, submitterHash: string): Promise<boolean> {
        const since = new Date(Date.now() - 60 * 60 * 1000);
        const repository = this.connection.getRepository(ctx, ContactMessage);

        const [fromSender, overall] = await Promise.all([
            repository
                .createQueryBuilder('m')
                .where('m."submitterHash" = :submitterHash', { submitterHash })
                .andWhere('m."createdAt" >= :since', { since })
                .getCount(),
            repository
                .createQueryBuilder('m')
                .where('m."createdAt" >= :since', { since })
                .getCount(),
        ]);

        return (
            fromSender >= this.options.maxSubmissionsPerHour ||
            overall >= this.options.maxGlobalSubmissionsPerHour
        );
    }

    /**
     * The storefront calls this API server-to-server, so the socket address is the
     * Next.js process for every visitor — keying on it alone would make the
     * per-sender limit a global one. The storefront therefore forwards the caller's
     * address, and this prefers it. A direct caller can forge that header; the
     * global ceiling above is what bounds the damage when they do.
     */
    private hashSubmitter(ctx: RequestContext): string {
        const forwarded = ctx.req?.headers?.[CLIENT_IP_HEADER];
        const claimed = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        const address =
            claimed?.trim() || ctx.req?.ip || ctx.req?.socket?.remoteAddress || 'unknown';

        return createHash('sha256')
            .update(`${this.options.hashSalt}:${address}`)
            .digest('hex')
            .slice(0, 64);
    }
}
