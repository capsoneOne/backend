'use client';

import { Link, usePathname } from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import {Package, User, MapPin, Settings} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {useTranslations} from 'next-intl';

const iconMap: Record<string, LucideIcon> = {
    Package,
    MapPin,
    User,
    Settings,
};

interface NavItem {
    href: string;
    labelKey: string;
    icon: string;
}

interface AccountNavLinksProps {
    items: NavItem[];
    layout: 'horizontal' | 'vertical';
}

export function AccountNavLinks({items, layout}: AccountNavLinksProps) {
    const pathname = usePathname();
    const t = useTranslations('Account');

    if (layout === 'horizontal') {
        return (
            <nav
                className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5"
                aria-label={t('accountNavigation')}
            >
                {items.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = iconMap[item.icon];
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            {Icon && <Icon className="size-4" aria-hidden="true" />}
                            {t(item.labelKey)}
                        </Link>
                    );
                })}
            </nav>
        );
    }

    return (
        <nav
            className="space-y-1 rounded-xl border border-border bg-card p-2"
            aria-label={t('accountNavigation')}
        >
            {items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = iconMap[item.icon];
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                            'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        {Icon && <Icon className="size-5" aria-hidden="true" />}
                        {t(item.labelKey)}
                    </Link>
                );
            })}
        </nav>
    );
}
