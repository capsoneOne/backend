'use client';

import {useState} from 'react';
import Image from 'next/image';
import {ShoppingCart, ArrowRight} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {Link} from '@/platform/i18n/navigation';
import {Price} from '@/features/pricing/price';

export interface CartDrawerLine {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    quantity: number;
    linePriceWithTax: number;
}

/**
 * Cart contents in a side sheet, so adding something from a grid does not throw
 * the shopper out of the results they were browsing.
 *
 * Quantity editing stays on the cart page: the mutations live in the cart
 * feature's route actions, and the architecture boundaries stop the site layer
 * reaching into them. The drawer is a preview plus two exits — view cart, or
 * check out.
 */
export function CartDrawer({
    lines,
    itemCount,
    subTotalWithTax,
    currencyCode,
}: {
    lines: CartDrawerLine[];
    itemCount: number;
    subTotalWithTax: number;
    currencyCode: string;
}) {
    const t = useTranslations('Cart');
    const tNav = useTranslations('Navigation');
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
                render={
                    <Button variant="ghost" size="icon" className="relative size-11">
                        <ShoppingCart className="size-5" />
                        {itemCount > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-4.5 text-primary-foreground">
                                {itemCount > 99 ? '99+' : itemCount}
                            </span>
                        )}
                        <span className="sr-only">{tNav('shoppingCart')}</span>
                    </Button>
                }
            />

            <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                <SheetHeader className="border-b border-border">
                    <SheetTitle>{t('title')}</SheetTitle>
                </SheetHeader>

                {lines.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                        <div className="flex size-14 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                            <ShoppingCart className="size-6" />
                        </div>
                        <p className="mt-2 text-lg font-medium">{t('empty')}</p>
                        <p className="font-light text-muted-foreground">{t('emptyMessage')}</p>
                        <Button
                            render={<Link href="/search" onClick={() => setOpen(false)} />}
                            nativeButton={false}
                            className="mt-3 rounded-full px-6"
                        >
                            {t('continueShopping')}
                        </Button>
                    </div>
                ) : (
                    <>
                        <ul className="flex-1 divide-y divide-border overflow-y-auto px-6">
                            {lines.map(line => (
                                <li key={line.id} className="flex gap-4 py-4">
                                    <Link
                                        href={`/product/${line.slug}`}
                                        onClick={() => setOpen(false)}
                                        className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted"
                                    >
                                        {line.imageUrl ? (
                                            <Image
                                                src={line.imageUrl}
                                                alt={line.name}
                                                fill
                                                sizes="80px"
                                                className="object-cover"
                                            />
                                        ) : null}
                                    </Link>
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            href={`/product/${line.slug}`}
                                            onClick={() => setOpen(false)}
                                            className="line-clamp-2 text-sm leading-snug transition-colors hover:text-primary"
                                        >
                                            {line.name}
                                        </Link>
                                        <p className="mt-1 text-sm font-light text-muted-foreground">
                                            × {line.quantity}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-sm font-bold tracking-tight">
                                        <Price value={line.linePriceWithTax} currencyCode={currencyCode} />
                                    </p>
                                </li>
                            ))}
                        </ul>

                        <div className="space-y-4 border-t border-border px-6 py-5">
                            <div className="flex items-baseline justify-between">
                                <span className="font-light text-muted-foreground">{t('subtotal')}</span>
                                <span className="text-lg font-bold tracking-tight">
                                    <Price value={subTotalWithTax} currencyCode={currencyCode} />
                                </span>
                            </div>
                            <p className="text-xs font-light text-muted-foreground">
                                {t('calculatedAtCheckout')}
                            </p>
                            <div className="flex flex-col gap-2">
                                <Button
                                    render={<Link href="/checkout" onClick={() => setOpen(false)} />}
                                    nativeButton={false}
                                    size="lg"
                                    className="w-full rounded-full"
                                >
                                    {t('proceedToCheckout')}
                                    <ArrowRight className="ml-2 size-4" />
                                </Button>
                                <Button
                                    render={<Link href="/cart" onClick={() => setOpen(false)} />}
                                    nativeButton={false}
                                    variant="outline"
                                    size="lg"
                                    className="w-full rounded-full"
                                >
                                    {t('title')}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
