'use client';

import {Heart} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Link, usePathname} from '@/platform/i18n/navigation';
import {useWishlist} from '@/features/wishlist/wishlist-context';
import {cn} from '@/lib/utils';

/**
 * Header entry point for the wishlist, with a count badge.
 *
 * Lives under `site/` rather than in the wishlist feature because the
 * architecture boundaries forbid a feature importing site composition, and this
 * Uses `Link` from the i18n navigation module, not `NavigationLink`: the latter
 * is a server component that reads `next/root-params`, which cannot be pulled
 * into a client bundle.
 */
export function WishlistLink() {
    const t = useTranslations('Wishlist');
    const {items, ready} = useWishlist();
    const pathname = usePathname();
    const count = items.length;
    const active = pathname.startsWith('/wishlist');

    return (
        <Link
            href="/wishlist"
            aria-current={active ? 'page' : undefined}
            className={cn(
                'relative inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                active && 'bg-primary/10 text-primary',
            )}
            title={t('navLabel')}
        >
            <Heart className="size-5" />
            {ready && count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-4.5 text-primary-foreground">
                    {count > 99 ? '99+' : count}
                </span>
            ) : null}
            <span className="sr-only">{t('navLabel')}</span>
        </Link>
    );
}
