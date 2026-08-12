import {cn} from '@/lib/utils';
import {SITE_NAME} from '@/config/metadata';
import {Shirt} from 'lucide-react';

/**
 * A clothing-first mark. Visual search remains a feature in navigation rather
 * than the symbol used to define the entire store.
 *
 * The wordmark reads `NEXT_PUBLIC_SITE_NAME`, so renaming the store stays an env
 * change. Multi-word names use a light-to-bold contrast; single-word names use
 * the bold weight for a compact storefront wordmark.
 */
export function BrandMark({className}: {className?: string}) {
    return (
        <span
            className={cn(
                'relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground elevate-1',
                className,
            )}
        >
            <Shirt className="size-5" aria-hidden="true" />
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
                <span className={second ? 'font-light' : 'font-bold'}>{first}</span>
                {second ? <span className="font-bold">{' '}{second}</span> : null}
            </span>
            {responsive ? <span className="sr-only sm:hidden">{SITE_NAME}</span> : null}
        </span>
    );
}
