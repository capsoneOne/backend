'use client';

import {Heart} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {toast} from 'sonner';
import {cn} from '@/lib/utils';
import {useWishlist, type WishlistItem} from '@/features/wishlist/wishlist-context';

/*
 * Top-level rather than under `components/` deliberately: the architecture
 * boundaries stop other features importing `features/wishlist/components/...`,
 * and product tiles — owned by the products feature — need this button.
 */

/**
 * The heart on a product tile.
 *
 * Tiles are wrapped in a `<Link>`, so this must stop both the click and the
 * default navigation — otherwise saving a product also opens it.
 */
export function WishlistButton({
    item,
    className,
    variant = 'overlay',
}: {
    item: Omit<WishlistItem, 'addedAt'>;
    className?: string;
    variant?: 'overlay' | 'inline';
}) {
    const t = useTranslations('Wishlist');
    const {has, toggle, ready} = useWishlist();
    const saved = has(item.productId);

    return (
        <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? t('remove', {name: item.name}) : t('add', {name: item.name})}
            title={saved ? t('removeShort') : t('addShort')}
            onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                const added = toggle(item);
                toast(added ? t('addedToast') : t('removedToast'), {description: item.name});
            }}
            className={cn(
                'inline-flex size-9 items-center justify-center rounded-full transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                variant === 'overlay'
                    ? 'bg-background/85 elevate-1 backdrop-blur-md hover:bg-background'
                    : 'border border-border bg-card hover:bg-accent',
                // Until localStorage has been read, render the neutral state rather
                // than an empty heart that flips a moment later.
                !ready && 'opacity-70',
                className,
            )}
        >
            <Heart
                className={cn(
                    'size-4.5 transition-colors',
                    saved ? 'fill-primary text-primary' : 'text-foreground',
                )}
            />
        </button>
    );
}
