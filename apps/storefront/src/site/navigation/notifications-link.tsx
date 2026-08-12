'use client';

import {Bell} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Link, usePathname} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import {navbarActiveClass, navbarIconClass} from '@/site/navigation/navigation-styles';

export function NotificationsLink({className}: {className?: string}) {
    const t = useTranslations('Navigation');
    const pathname = usePathname();
    const active = pathname.startsWith('/notifications');

    return (
        <Link
            href="/notifications"
            aria-current={active ? 'page' : undefined}
            className={cn(
                navbarIconClass,
                active && navbarActiveClass,
                className,
            )}
            title={t('notifications')}
        >
            <Bell className="size-5" aria-hidden="true" />
            <span className="sr-only">{t('notifications')}</span>
        </Link>
    );
}
