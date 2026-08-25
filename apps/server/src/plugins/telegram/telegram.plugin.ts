import { OnApplicationBootstrap } from '@nestjs/common';
import {
    EventBus,
    Logger,
    OrderStateTransitionEvent,
    PluginCommonModule,
    ScheduledTask,
    VendurePlugin,
} from '@vendure/core';

import { ContactMessageReceivedEvent } from '../contact/contact-message.event';
import { FAILED_JOB_TASK_ID, TELEGRAM_PLUGIN_OPTIONS } from './constants';
import { TelegramService, loggerCtx } from './telegram.service';
import { TelegramPluginOptions } from './types';

/**
 * Telegram notifications for shop activity.
 *
 * Configuration decides whether it runs: without a bot token and chat id the plugin
 * loads and does nothing, so a clone with no bot still boots. Same reasoning as the
 * mail transport — a separate on/off flag can disagree with the credentials, and the
 * failure mode is a notification nobody knows was dropped.
 *
 * What is deliberately not here: customer logins, order state changes beyond
 * payment, and new registrations. A channel is only useful while it stays quiet
 * enough to read, so an alert has to be rare, actionable, and invisible elsewhere.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        TelegramService,
        { provide: TELEGRAM_PLUGIN_OPTIONS, useFactory: () => TelegramPlugin.options },
    ],
    compatibility: '^3.0.0',
    configuration: config => {
        // Vendure emits no event when a job fails — there is no job event on the bus
        // at all — so the only way to notice is to look.
        config.schedulerOptions.tasks.push(
            new ScheduledTask({
                id: FAILED_JOB_TASK_ID,
                description: 'Report failed background jobs to Telegram',
                schedule: TelegramPlugin.options.failedJobSchedule,
                // A slow sweep must not stack on top of the next one; overlapping
                // runs would report the same failures twice.
                preventOverlap: true,
                execute: async ({ injector }) => {
                    const telegram = injector.get(TelegramService);
                    await telegram.sweepFailedJobs(TelegramPlugin.sweepIntervalMs);
                },
            }),
        );
        return config;
    },
})
export class TelegramPlugin implements OnApplicationBootstrap {
    static options: TelegramPluginOptions;

    /**
     * How far back a sweep looks. Derived from the cron expression's minute field
     * when it is a simple interval, and otherwise assumed to be five minutes — the
     * lookback only has to cover the gap between runs, and erring long costs a
     * duplicate that the id set then removes.
     */
    static get sweepIntervalMs(): number {
        const match = /^\*\/(\d+) /.exec(this.options.failedJobSchedule);
        const minutes = match ? Number(match[1]) : 5;
        return minutes * 60_000;
    }

    static init(options: TelegramPluginOptions): typeof TelegramPlugin {
        this.options = options;
        return TelegramPlugin;
    }

    constructor(
        private eventBus: EventBus,
        private telegram: TelegramService,
    ) {}

    onApplicationBootstrap(): void {
        const enabled = this.telegram.enabledKinds;
        if (enabled.length === 0) {
            Logger.info('Telegram notifications disabled (no bot configured)', loggerCtx);
            return;
        }
        Logger.info(`Telegram notifications enabled for: ${enabled.join(', ')}`, loggerCtx);

        // PaymentSettled, not PaymentAuthorized: authorised means the money is only
        // reserved, and alerting on it would announce payments that can still fail.
        // This is the same state the confirmation email waits for.
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(event => {
            if (event.toState !== 'PaymentSettled' || event.fromState === 'Modifying') return;
            this.telegram.enqueuePaymentNotification(event.order.id);
        });

        // Contact messages are stored and nothing else — no email is sent for them —
        // so without this they wait until someone thinks to open the dashboard.
        this.eventBus.ofType(ContactMessageReceivedEvent).subscribe(event => {
            this.telegram.enqueueContactNotification({
                kind: 'contact',
                name: event.message.name,
                email: event.message.email,
                topic: event.message.topic,
                orderCode: event.message.orderCode,
                body: event.message.body,
            });
        });

    }
}
