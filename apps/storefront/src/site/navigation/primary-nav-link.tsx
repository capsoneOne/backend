'use client';

import type {ComponentProps} from 'react';
import {cn} from '@/lib/utils';
import {Link, usePathname} from '@/platform/i18n/navigation';

export function PrimaryNavLink({href, className, ...props}: ComponentProps<typeof Link>) {
    const pathname = usePathname();
    const active = pathname === href;

    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'inline-flex h-9 items-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active && 'bg-primary/10 text-primary',
                className,
            )}
            {...props}
        />
    );
}
