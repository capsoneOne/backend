import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
    ID,
    JobQueue,
    JobQueueService,
    Logger,
    Order,
    OrderService,
    RequestContext,
    RequestContextService,
    TransactionalConnection,
} from '@vendure/core';

import {
    CONTACT_PREVIEW_LENGTH,
    MAX_LISTED_FAILURES,
    MAX_LISTED_LINES,
    SWEEP_OVERLAP_FACTOR,
    TELEGRAM_MAX_MESSAGE_LENGTH,
    TELEGRAM_NOTIFY_QUEUE,
    TELEGRAM_PLUGIN_OPTIONS,
} from './constants';
import {
    escapeHtml,
    field,
    formatDateTime,
    formatMoney,
    pre,
    row,
    rule,
    truncate,
} from './format';
import {
    DESTINATION_BY_KIND,
    FailedJobSummary,
    NotifyJobData,
    TelegramDestination,
    TelegramPluginOptions,
} from './types';

export const loggerCtx = 'TelegramPlugin';

/**
 * Pushes shop notifications to Telegram.
 *
 * Sends go through the job queue rather than straight off the event, for two
 * reasons: an outbound HTTP call must never sit in the path of an order transition,
 * and Telegram being briefly unreachable should cost a retry rather than the
 * notification.
 *
 * Telegram is a nudge, never a record. Every alert here describes something already
 * persisted, so a message that never arrives loses promptness and nothing else.
 */
@Injectable()
export class TelegramService implements OnModuleInit {
    private queue: JobQueue<NotifyJobData>;

    /**
     * Failed job ids already reported. Sweeps overlap deliberately, so the same
     * failure is seen more than once; this is what stops it being sent twice. In
     * memory only — a restart may re-report a recent failure, which is a better
     * trade than a table to keep tidy for something this small.
     */
    private readonly reportedFailures = new Set<string>();

    constructor(
        private jobQueueService: JobQueueService,
        private orderService: OrderService,
        private requestContextService: RequestContextService,
        private connection: TransactionalConnection,
        @Inject(TELEGRAM_PLUGIN_OPTIONS) private options: TelegramPluginOptions,
    ) {}

    private destinationFor(kind: NotifyJobData['kind']): TelegramDestination {
        return this.options[DESTINATION_BY_KIND[kind]];
    }

    isKindEnabled(kind: NotifyJobData['kind']): boolean {
        const destination = this.destinationFor(kind);
        return Boolean(destination.botToken && destination.chatId);
    }

    get enabledKinds(): string[] {
        return (Object.keys(DESTINATION_BY_KIND) as Array<NotifyJobData['kind']>).filter(kind =>
            this.isKindEnabled(kind),
        );
    }

    async onModuleInit(): Promise<void> {
        this.queue = await this.jobQueueService.createQueue<NotifyJobData>({
            name: TELEGRAM_NOTIFY_QUEUE,
            process: async job => {
                const text = await this.buildMessage(job.data);
                if (text) await this.send(job.data.kind, text);
            },
        });
    }

    // --- enqueueing ----------------------------------------------------------

    enqueuePaymentNotification(orderId: ID): void {
        this.enqueue({ kind: 'payment', orderId });
    }

    enqueueContactNotification(message: Extract<NotifyJobData, { kind: 'contact' }>): void {
        this.enqueue(message);
    }

    /**
     * Reports failed jobs seen since the previous sweep. Vendure emits no event when
     * a job fails — there is no job event on the bus at all — so this is polled from
     * the job records rather than subscribed to.
     */
    async sweepFailedJobs(intervalMs: number): Promise<void> {
        if (!this.isKindEnabled('failed-jobs')) return;

        // The window is computed in SQL rather than passed as a Date. job_record
        // stores naive UTC timestamps, so a JS Date arrives offset by the server's
        // zone — seven hours here, which silently matched nothing at all. Comparing
        // the database's clock against itself has no zone to get wrong.
        const lookbackMs = Math.round(intervalMs * SWEEP_OVERLAP_FACTOR);
        const rows: Array<{ id: string; queueName: string; error: string | null }> =
            await this.connection.rawConnection.query(
                `SELECT id::text AS id, "queueName", error
                   FROM job_record
                  WHERE state = 'FAILED'
                    AND "updatedAt" >= (NOW() AT TIME ZONE 'UTC') - ($1::bigint * INTERVAL '1 millisecond')
                  ORDER BY id DESC
                  LIMIT 50`,
                [lookbackMs],
            );

        const fresh = rows.filter(record => !this.reportedFailures.has(record.id));
        if (fresh.length === 0) return;

        for (const record of fresh) this.reportedFailures.add(record.id);
        this.pruneReportedFailures();

        this.enqueue({
            kind: 'failed-jobs',
            failures: fresh.map<FailedJobSummary>(record => ({
                id: record.id,
                queueName: record.queueName,
                error: record.error ?? 'no error recorded',
            })),
        });
    }

    private enqueue(data: NotifyJobData): void {
        // Checked before queueing, not at send time: a disabled alert should leave
        // no jobs behind to run if it is later switched on.
        if (!this.isKindEnabled(data.kind)) return;
        void this.queue.add(data, { retries: 3 });
    }

    /** Keeps the dedupe set from growing without bound in a long-running process. */
    private pruneReportedFailures(): void {
        const LIMIT = 500;
        if (this.reportedFailures.size <= LIMIT) return;
        let removed = 0;
        const excess = this.reportedFailures.size - LIMIT;
        for (const id of this.reportedFailures) {
            this.reportedFailures.delete(id);
            if (++removed >= excess) break;
        }
    }

    // --- message building ----------------------------------------------------

    private async buildMessage(data: NotifyJobData): Promise<string | null> {
        switch (data.kind) {
            case 'payment':
                return this.buildPaymentMessage(data.orderId);
            case 'contact':
                return this.buildContactMessage(data);
            case 'failed-jobs':
                return this.buildFailedJobsMessage(data.failures);
        }
    }

    private async buildPaymentMessage(orderId: ID): Promise<string | null> {
        // Re-read rather than trusting the event's entity: that one is a snapshot
        // taken before the transition committed.
        const ctx: RequestContext = await this.requestContextService.create({ apiType: 'admin' });
        const order = await this.orderService.findOne(ctx, orderId, ['lines', 'customer']);
        if (!order) {
            Logger.warn(`Order ${String(orderId)} vanished before notifying`, loggerCtx);
            return null;
        }
        return this.formatPayment(order);
    }

    private formatPayment(order: Order): string {
        const currency = order.currencyCode;

        const items = order.lines.slice(0, MAX_LISTED_LINES).map(line => {
            const name = line.productVariant?.name ?? 'Item';
            return row(`${line.quantity} x ${name}`, formatMoney(line.linePriceWithTax, currency));
        });
        const hidden = order.lines.length - items.length;
        if (hidden > 0) items.push(row(`+ ${hidden} more`, ''));

        const receipt = pre([
            ...items,
            rule(),
            row('Subtotal', formatMoney(order.subTotalWithTax, currency)),
            row('Shipping', formatMoney(order.shippingWithTax, currency)),
            row('TOTAL', formatMoney(order.totalWithTax, currency)),
        ]);

        const customer = order.customer
            ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
            : 'Guest';

        return truncate(
            [
                '💰 <b>Payment received</b>',
                `<code>${escapeHtml(order.code)}</code> · ${escapeHtml(formatDateTime(order.orderPlacedAt))}`,
                '',
                `👤 <b>${escapeHtml(customer)}</b>`,
                order.customer ? `✉️ ${escapeHtml(order.customer.emailAddress)}` : '',
                '',
                receipt,
                `<a href="${this.options.storefrontUrl}/order-confirmation/${encodeURIComponent(order.code)}">View order →</a>`,
            ]
                .filter(Boolean)
                .join('\n'),
            TELEGRAM_MAX_MESSAGE_LENGTH,
        );
    }

    private buildContactMessage(data: Extract<NotifyJobData, { kind: 'contact' }>): string {
        const details = pre([
            field('From', data.name),
            field('About', data.topic),
            ...(data.orderCode ? [field('Order', data.orderCode)] : []),
        ]);

        return truncate(
            [
                '✉️ <b>New contact message</b>',
                `<code>${escapeHtml(data.email)}</code>`,
                '',
                details,
                `<i>${escapeHtml(truncate(data.body, CONTACT_PREVIEW_LENGTH))}</i>`,
                '',
                // The message is already stored; this points at where it is answered.
                '📥 Customers → Contact messages',
            ].join('\n'),
            TELEGRAM_MAX_MESSAGE_LENGTH,
        );
    }

    private buildFailedJobsMessage(failures: FailedJobSummary[]): string {
        const listed: string[] = [];
        for (const failure of failures.slice(0, MAX_LISTED_FAILURES)) {
            listed.push(row(failure.queueName, `#${failure.id}`));
            // First line only: a stack trace turns the alert into a wall of text.
            listed.push(`  ${truncate(failure.error.split('\n')[0].trim(), 30)}`);
        }
        const hidden = failures.length - Math.min(failures.length, MAX_LISTED_FAILURES);
        if (hidden > 0) listed.push(`+ ${hidden} more`);

        const count = failures.length;
        return truncate(
            [
                `⚠️ <b>${count} background job${count === 1 ? '' : 's'} failed</b>`,
                `<code>${escapeHtml(formatDateTime(new Date()))}</code>`,
                '',
                pre(listed),
            ].join('\n'),
            TELEGRAM_MAX_MESSAGE_LENGTH,
        );
    }

    // --- delivery ------------------------------------------------------------

    private async send(kind: NotifyJobData['kind'], text: string): Promise<void> {
        const { botToken, chatId, topicId } = this.destinationFor(kind);
        if (!botToken || !chatId) return;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.options.requestTimeoutMs);

        try {
            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    parse_mode: 'HTML',
                    // Omitted entirely when there is no topic: sending a null
                    // message_thread_id is rejected, where an absent one correctly
                    // means "the General topic".
                    ...(topicId ? { message_thread_id: topicId } : {}),
                    // The link is for a human to click, not to unfurl into a preview
                    // card that buries the receipt above it.
                    disable_web_page_preview: true,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                // Telegram puts the actionable part in the body — "chat not found",
                // "message thread not found" — so the status alone is not enough to
                // debug from.
                const body = await response.text().catch(() => '');
                throw new Error(`Telegram ${kind} API ${response.status}: ${body.slice(0, 200)}`);
            }
        } finally {
            clearTimeout(timer);
        }
    }
}
