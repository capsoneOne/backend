'use client';

import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {ArrowRight, Heart, Lock, Trash2} from 'lucide-react';
import {Link} from '@/platform/i18n/navigation';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {ProductTile, ProductTileSkeleton} from '@/components/product-tile';
import {CataloguePageHeader, StorefrontPageShell} from '@/components/catalogue-page';
import {Price} from '@/features/pricing/price';
import {useWishlist} from '@/features/wishlist/wishlist-context';

/**
 * The wishlist.
 *
 * Client-rendered, because the list lives in localStorage — there is no server
 * state to fetch. `ready` gates the first paint so a shopper with wishlist items
 * never sees the empty state flash before hydration finishes.
 */
export function WishlistList() {
    const t = useTranslations('Wishlist');
    const {items, ready, remove, clear} = useWishlist();
    const clearWishlist = () => {
        if (window.confirm(t('clearConfirm'))) clear();
    };

    return (
        <StorefrontPageShell>
            <div className="mx-auto max-w-4xl">
                <CataloguePageHeader
                    eyebrow={t('eyebrow')}
                    title={t('title')}
                    description={t('description')}
                    actions={(
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <Heart className="size-4 text-primary" aria-hidden="true" />
                                {ready ? t('count', {count: items.length}) : t('loading')}
                            </span>
                            {ready && items.length > 0 ? (
                                <Button variant="ghost" size="sm" onClick={clearWishlist} className="min-h-10 px-3 text-muted-foreground">
                                    <Trash2 className="mr-2 size-4" />
                                    {t('clearAll')}
                                </Button>
                            ) : null}
                        </div>
                    )}
                />

                <div>
                    {!ready ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
                            {Array.from({length: 4}).map((_, i) => (
                                <ProductTileSkeleton key={i} />
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardContent className="grid p-0 md:grid-cols-2">
                                <div className="flex min-h-72 items-center justify-center bg-secondary/45 p-7 sm:p-9">
                                    <Image
                                        src="/storyset/online-wishes-list-cuate.svg"
                                        alt={t('illustrationAlt')}
                                        width={500}
                                        height={500}
                                        priority
                                        className="max-h-80 w-full object-contain"
                                    />
                                </div>

                                <div className="flex flex-col justify-center px-7 py-10 sm:p-10">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t('emptyEyebrow')}</p>
                                    <h2 className="mt-3 text-balance text-2xl font-bold md:text-3xl">{t('emptyTitle')}</h2>
                                    <p className="mt-4 max-w-lg font-light leading-relaxed text-muted-foreground">{t('emptyBody')}</p>
                                    <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                                        <Button render={<Link href="/search" />} nativeButton={false} className="min-h-11 rounded-lg px-5">
                                            {t('browse')}
                                            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                                        </Button>
                                        <Link
                                            href="/categories"
                                            className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                                        >
                                            {t('exploreCategories')}
                                        </Link>
                                    </div>
                                    <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                                        <Lock className="size-3.5 text-primary" aria-hidden="true" />
                                        {t('deviceNote')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
                            {items.map(item => (
                                <ProductTile
                                    key={item.productId}
                                    href={`/product/${item.slug}`}
                                    imageUrl={item.imageUrl}
                                    imageAlt={item.name}
                                    title={item.name}
                                    noImageLabel={t('noImage')}
                                    actions={(
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                remove(item.productId);
                                            }}
                                            aria-label={t('remove', {name: item.name})}
                                            title={t('removeShort')}
                                            className="inline-flex size-10 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                        >
                                            <Trash2 className="size-4" aria-hidden="true" />
                                        </button>
                                    )}
                                    footer={(
                                        <p className="text-[0.9375rem] font-bold tracking-tight">
                                            <Price value={item.price} currencyCode={item.currencyCode} />
                                        </p>
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </StorefrontPageShell>
    );
}
