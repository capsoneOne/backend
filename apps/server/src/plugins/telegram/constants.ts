export const TELEGRAM_PLUGIN_OPTIONS = Symbol('TELEGRAM_PLUGIN_OPTIONS');

export const TELEGRAM_NOTIFY_QUEUE = 'telegram-notify';

export const FAILED_JOB_TASK_ID = 'telegram-failed-job-sweep';

/** Telegram rejects messages over 4096 characters outright. */
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

/** Order lines listed individually before the message collapses to a count. */
export const MAX_LISTED_LINES = 10;

/** Failed jobs named individually in one sweep before the message collapses. */
export const MAX_LISTED_FAILURES = 5;

/** Contact message characters quoted before truncation. */
export const CONTACT_PREVIEW_LENGTH = 400;

/**
 * How far back a sweep looks, relative to its own interval. The overlap means a job
 * that fails while a sweep is mid-flight is caught by the next one rather than
 * falling into the gap between them; the id set removes the resulting duplicates.
 */
export const SWEEP_OVERLAP_FACTOR = 1.5;
