'use client';

import {useSelectedLayoutSegment} from 'next/navigation';
import {ComponentProps} from 'react';
import { Link } from '@/platform/i18n/navigation';
import {
    NavigationMenuLink,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {cn} from '@/lib/utils';
import {navbarActiveClass, navbarPrimaryClass} from '@/site/navigation/navigation-styles';

export function NavbarLink({href, ...rest}: ComponentProps<typeof Link>) {
    const selectedLayoutSegment = useSelectedLayoutSegment();
    const pathname = selectedLayoutSegment ? `/${selectedLayoutSegment}` : '/';
    const isActive = pathname === href;

    return (
        <NavigationMenuLink render={<Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(navigationMenuTriggerStyle(), navbarPrimaryClass, 'bg-transparent', isActive && navbarActiveClass)}
                href={href}
                {...rest}
            />} active={isActive} />
    );
}
