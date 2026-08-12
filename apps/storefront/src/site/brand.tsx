import {cn} from '@/lib/utils';
import {SITE_NAME} from '@/config/metadata';
import Image from 'next/image';

/**
 * Lumé's approved nested-corner mark. The transparent source asset is shared by
 * the storefront chrome, loading states, favicon, and installable app identity.
 */
export function BrandMark({className}: {className?: string}) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'relative inline-flex h-9 w-10 shrink-0 items-center justify-center',
                className,
            )}
        >
            <Image
                src="/brand/lume-mark.png"
                alt=""
                width={902}
                height={791}
                sizes="48px"
                className="size-full object-contain"
            />
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
    return (
        <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
            <BrandMark />
            <span
                className={cn(
                    'truncate text-[1.1875rem] font-medium leading-none tracking-[-0.045em] text-foreground',
                    responsive && 'hidden sm:inline',
                )}
            >
                {SITE_NAME}
            </span>
            {responsive ? <span className="sr-only sm:hidden">{SITE_NAME}</span> : null}
        </span>
    );
}
