/**
 * Message composition for Telegram.
 *
 * Telegram's HTML mode has no tables, so anything that needs to line up is built by
 * hand inside a <pre> block, where the monospace font makes column alignment hold.
 *
 * Only <b>, <i>, <code>, <pre> and <a> are used. Newer tags like <blockquote> exist,
 * but an unsupported tag is rejected by the API with a 400 rather than degrading, so
 * the safe subset is worth more than the styling.
 */

/** Characters per line inside <pre>. Chosen to fit a phone without wrapping. */
export const PRE_WIDTH = 34;

export function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function truncate(value: string, max: number): string {
    return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/**
 * Lays a label against a right-aligned value across a fixed width. When the two
 * cannot fit, the label gives up space rather than the number — a truncated total is
 * useless, a truncated product name is still recognisable.
 */
export function row(label: string, value: string, width = PRE_WIDTH): string {
    const room = width - value.length - 1;
    const left = room > 0 ? truncate(label, room) : '';
    const gap = Math.max(1, width - left.length - value.length);
    return `${left}${' '.repeat(gap)}${value}`;
}

/**
 * A label with its value beside it, in a fixed label column. Used where the value is
 * text rather than a number: right-aligning a name across the width reads as an
 * accident, where right-aligning money reads as a receipt.
 */
export function field(label: string, value: string, labelWidth = 8, width = PRE_WIDTH): string {
    const left = truncate(label, labelWidth).padEnd(labelWidth);
    return `${left}${truncate(value, width - labelWidth)}`;
}

export function rule(width = PRE_WIDTH): string {
    return '─'.repeat(width);
}

/** A <pre> block. Contents are escaped here so callers cannot forget. */
export function pre(lines: string[]): string {
    return `<pre>${escapeHtml(lines.join('\n'))}</pre>`;
}

export function formatMoney(amount: number, currencyCode: string): string {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(
            amount / 100,
        );
    } catch {
        // An unrecognised currency code should not lose the notification.
        return `${(amount / 100).toFixed(2)} ${currencyCode}`;
    }
}

export function formatDateTime(value: Date | string | null | undefined): string {
    const date = value ? new Date(value) : new Date();
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
