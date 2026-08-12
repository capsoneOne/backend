'use client';

import type {ComponentProps} from 'react';
import {cn} from '@/lib/utils';
import {Link, usePathname} from '@/platform/i18n/navigation';
import {navbarActiveClass, navbarPrimaryClass} from '@/site/navigation/navigation-styles';

export function PrimaryNavLink({href, className, ...props}: ComponentProps<typeof Link>) {
    const pathname = usePathname();
    const active = pathname === href;

    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                navbarPrimaryClass,
                active && navbarActiveClass,
                className,
            )}
            {...props}
        />
    );
}
