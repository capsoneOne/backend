import {cn} from '@/lib/utils';
import {SITE_NAME} from '@/config/metadata';

/**
 * The Visual Search mark: an aperture ring with a focus dot, drawn rather than
 * imported so it inherits `currentColor` and stays crisp at every size.
 *
 * The wordmark reads `NEXT_PUBLIC_SITE_NAME`, so renaming the store stays an env
 * change. It sets the two words on one line at different weights — Ubuntu's 300
 * against its 700 is the whole logotype.
 */
export function BrandMark({className}: {className?: string}) {
    return (
        <span
            className={cn(
                'relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background',
                className,
            )}
        >
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="2" />
                {/* The one spot of coral in the mark: the focus point. */}
                <circle cx="10.5" cy="10.5" r="2" className="fill-primary" />
                <path
                    d="M15.4 15.4 20 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </svg>
        </span>
    );
}

export function Brand({
    className,
    /** Below `sm` the header has no room for a wordmark beside the action icons. */
    responsive = true,
}: {
    className?: string;
    responsive?: boolean;
}) {
    const [first, ...rest] = SITE_NAME.split(' ');
    const second = rest.join(' ');

    return (
        <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
            <BrandMark />
            <span
                className={cn(
                    'truncate text-[1.0625rem] leading-none tracking-tight',
                    responsive && 'hidden sm:inline',
                )}
            >
                <span className="font-light">{first}</span>
                {second ? <span className="font-bold">{' '}{second}</span> : null}
            </span>
            {responsive ? <span className="sr-only sm:hidden">{SITE_NAME}</span> : null}
        </span>
    );
}
