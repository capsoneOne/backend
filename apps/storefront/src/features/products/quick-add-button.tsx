'use client';

import {useState, useTransition} from 'react';
import {Check, Loader2, Plus} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {toast} from 'sonner';
import {useRouter} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import {quickAddToCart} from '@/features/products/quick-add';

/**
 * Add to cart straight from a grid tile.
 *
 * Whether one click is even possible depends on the variant count, which the
 * search result does not carry — so the server action decides, and this button
 * falls back to opening the product page when a choice is needed.
 */
export function QuickAddButton({
    slug,
    productName,
    productHref,
    className,
}: {
    slug: string;
    productName: string;
    productHref: string;
    className?: string;
}) {
    const t = useTranslations('Product');
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [done, setDone] = useState(false);

    const handleClick = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        startTransition(async () => {
            const result = await quickAddToCart(slug);

            if (result.status === 'added') {
                setDone(true);
                toast.success(t('addedToCartMessage'), {
                    description: t('addedToCartDescription', {name: productName}),
                });
                window.setTimeout(() => setDone(false), 2000);
                return;
            }
            if (result.status === 'needs-options') {
                router.push(productHref);
                return;
            }
            if (result.status === 'out-of-stock') {
                toast.error(t('outOfStock'), {description: productName});
                return;
            }
            toast.error(t('errorTitle'), {description: result.message});
        });
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={pending}
            aria-label={t('addToCartNamed', {name: productName})}
            title={t('addToCart')}
            className={cn(
                'inline-flex size-9 items-center justify-center rounded-full bg-background/85 elevate-1 backdrop-blur-md transition-all',
                'hover:bg-foreground hover:text-background disabled:opacity-60',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                className,
            )}
        >
            {pending ? (
                <Loader2 className="size-4.5 animate-spin" />
            ) : done ? (
                <Check className="size-4.5 text-primary" />
            ) : (
                <Plus className="size-4.5" />
            )}
        </button>
    );
}
