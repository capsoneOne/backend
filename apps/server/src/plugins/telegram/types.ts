export interface TelegramDestination {
    /** Bot token from @BotFather. Absent means this alert is off. */
    botToken?: string;
    /** Chat to post into. A forum group id starts with -100. */
    chatId?: string;
    /**
     * Forum topic to post into (`message_thread_id`). Omitted, the message lands in
     * the group's General topic — which is also the only option in a group that has
     * Topics switched off.
     */
    topicId?: number;
}

export interface TelegramPluginOptions {
    /** Money arriving. */
    payments: TelegramDestination;
    /** Customer messages from the contact form. */
    contact: TelegramDestination;
    /** Background jobs that failed. */
    jobFailures: TelegramDestination;
    /** How long to wait on the Telegram API before giving up and letting the job retry. */
    requestTimeoutMs: number;
    /** Storefront base URL, so a notification can link to the order it is about. */
    storefrontUrl: string;
    /** Cron expression controlling how often failed jobs are swept for. */
    failedJobSchedule: string;
}

export type FailedJobSummary = {
    id: string;
    queueName: string;
    error: string;
};

/**
 * One queue carries every notification kind. They share a delivery path — the same
 * endpoint, timeout and retry behaviour — and differ only in the text they build and
 * the destination they land in.
 */
export type NotifyJobData =
    | { kind: 'payment'; orderId: string | number }
    | {
          kind: 'contact';
          name: string;
          email: string;
          topic: string;
          orderCode: string | null;
          body: string;
      }
    | { kind: 'failed-jobs'; failures: FailedJobSummary[] };

/** Maps a notification kind onto the destination configured for it. */
export const DESTINATION_BY_KIND: Record<NotifyJobData['kind'], keyof Pick<
    TelegramPluginOptions,
    'payments' | 'contact' | 'jobFailures'
>> = {
    payment: 'payments',
    contact: 'contact',
    'failed-jobs': 'jobFailures',
};
