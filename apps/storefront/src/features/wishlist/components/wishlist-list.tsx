'use client';

import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {Heart, Trash2} from 'lucide-react';
import {Link} from '@/platform/i18n/navigation';
import {Button} from '@/components/ui/button';
import {ProductTileSkeleton} from '@/components/product-tile';
import {Price} from '@/features/pricing/price';
import {useWishlist} from '@/features/wishlist/wishlist-context';

/**
 * The saved-items list.
 *
 * Client-rendered, because the list lives in localStorage — there is no server
 * state to fetch. `ready` gates the first paint so a shopper with saved items
 * never sees the empty state flash before hydration finishes.
 */
export function WishlistList() {
    const t = useTranslations('Wishlist');
    const {items, ready, remove, clear} = useWishlist();

    return (
        <div className="container mx-auto mt-16 px-4 py-16 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
                <div>
                    <h1 className="text-4xl font-bold md:text-5xl">{t('title')}</h1>
                    <p className="mt-3 font-light text-muted-foreground">
                        {ready ? t('count', {count: items.length}) : t('loading')}
                    </p>
                </div>
                {ready && items.length > 0 ? (
                    <Button variant="ghost" size="sm" onClick={clear} className="rounded-full">
                        <Trash2 className="mr-2 size-4" />
                        {t('clearAll')}
                    </Button>
                ) : null}
            </div>

            {!ready ? (
                <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                    {Array.from({length: 4}).map((_, i) => (
                        <ProductTileSkeleton key={i} />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                        <Heart className="size-6" />
                    </div>
                    <p className="mt-2 text-lg font-medium">{t('emptyTitle')}</p>
                    <p className="font-light text-muted-foreground">{t('emptyBody')}</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-3">
                        <Button render={<Link href="/search" />} nativeButton={false} className="rounded-full px-6">
                            {t('browse')}
                        </Button>
                        <Button
                            render={<Link href="/visual-search" />}
                            nativeButton={false}
                            variant="outline"
                            className="rounded-full px-6"
                        >
                            {t('searchByImage')}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                    {items.map(item => (
                        <div key={item.productId} className="group flex flex-col">
                            <Link
                                href={`/product/${item.slug}`}
                                className="relative aspect-square overflow-hidden rounded-2xl bg-muted outline-none transition-all duration-500 group-hover:elevate-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                            >
                                {item.imageUrl ? (
                                    <Image
                                        src={item.imageUrl}
                                        alt={item.name}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center px-4 text-center text-sm font-light text-muted-foreground">
                                        {t('noImage')}
                                    </div>
                                )}
                                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/[0.06]" />
                            </Link>

                            <div className="flex items-start justify-between gap-2 px-1 pt-3.5">
                                <div className="min-w-0">
                                    <Link
                                        href={`/product/${item.slug}`}
                                        className="line-clamp-2 text-[0.9375rem] leading-snug transition-colors hover:text-primary"
                                    >
                                        {item.name}
                                    </Link>
                                    <p className="pt-1 text-[0.9375rem] font-bold tracking-tight">
                                        <Price value={item.price} currencyCode={item.currencyCode} />
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => remove(item.productId)}
                                    aria-label={t('remove', {name: item.name})}
                                    className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
