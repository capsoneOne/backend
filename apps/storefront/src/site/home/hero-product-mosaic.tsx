import Image from 'next/image';
import {cacheLife, cacheTag} from 'next/cache';
import type {ReactNode} from 'react';

import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {Price} from '@/features/pricing/price';
import {GetHeroMosaicProductsQuery, HeroMosaicProductFragment} from '@/features/products/graphql';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {query} from '@/platform/vendure/api';
import {readFragment} from '@/platform/vendure/graphql';

/**
 * Hero artwork: a staggered collage of real catalog products.
 *
 * A single stock photo asserted "every category"; four real products across
 * different categories demonstrate it. The columns are deliberately offset and
 * sit on card surfaces because `ShopByCategory` renders a flush bento grid
 * immediately below — without the stagger the two blocks read as the same
 * component twice.
 */

const TILE_COUNT = 4;

/** Every product shot is square, so the frame is too — a taller frame crops the subject. */
const TILE_ASPECT = 'aspect-square';

interface MosaicProduct {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    imageArea: number;
    price: number;
    currencyCode: string;
}

async function getMosaicProducts(locale: string, currencyCode: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`hero-mosaic-${locale}-${currencyCode}`);
    cacheTag('products');

    // Deliberately wider than TILE_COUNT: the ranking below needs candidates to
    // choose between, and products without imagery get dropped first.
    const result = await query(
        GetHeroMosaicProductsQuery,
        {options: {take: 48, sort: {name: 'ASC'}}},
        {languageCode: locale, currencyCode},
    );
    return result.data.products.items;
}

export async function HeroProductMosaic({fallback}: {fallback: ReactNode}) {
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const items = await getMosaicProducts(locale, currencyCode).catch(() => []);

    const candidates: MosaicProduct[] = [];
    for (const item of items) {
        const product = readFragment(HeroMosaicProductFragment, item);
        const asset = product.featuredAsset;
        if (!asset || product.variants.length === 0) continue;

        candidates.push({
            id: product.id,
            name: product.name,
            slug: product.slug,
            imageUrl: asset.preview,
            imageArea: (asset.width ?? 0) * (asset.height ?? 0),
            price: Math.min(...product.variants.map(variant => variant.priceWithTax)),
            currencyCode: product.variants[0].currencyCode,
        });
    }

    // An empty or image-less catalog should not leave the hero with a hole in it.
    if (candidates.length < TILE_COUNT) return <>{fallback}</>;

    // The hero carries the page's largest imagery, so it takes the catalog's
    // highest-resolution shots. On the seeded catalog that also happens to divide
    // the photographic products from the flat colour fixtures built for the `sim`
    // embedder, which look like plain shapes at this size. Name breaks ties so a
    // catalog of uniform-resolution assets still renders the same on every build.
    const tiles = candidates
        .sort((a, b) => b.imageArea - a.imageArea || a.name.localeCompare(b.name))
        .slice(0, TILE_COUNT);

    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col gap-3 sm:gap-4">
                {tiles.slice(0, 2).map(product => (
                    <MosaicTile key={product.id} product={product} priority />
                ))}
            </div>
            {/* The offset is what separates this from the bento grid below. */}
            <div className="flex flex-col gap-3 pt-6 sm:gap-4 sm:pt-10">
                {tiles.slice(2).map(product => (
                    <MosaicTile key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}

function MosaicTile({product, priority}: {product: MosaicProduct; priority?: boolean}) {
    return (
        <Link
            href={`/product/${product.slug}`}
            className="group interactive-lift block overflow-hidden rounded-xl border border-border bg-card shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
            <div className={`relative w-full bg-muted ${TILE_ASPECT}`}>
                <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    priority={priority}
                    sizes="(min-width: 1024px) 16rem, 45vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                />
            </div>
            <div className="px-3 py-2.5">
                <p className="truncate text-xs font-medium leading-tight">{product.name}</p>
                <p className="mt-1 text-xs font-bold text-primary">
                    <Price value={product.price} currencyCode={product.currencyCode} />
                </p>
            </div>
        </Link>
    );
}

export function HeroProductMosaicSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4" aria-hidden="true">
            <div className="flex flex-col gap-3 sm:gap-4">
                {[0, 1].map(index => (
                    <div key={index} className={`animate-pulse rounded-xl bg-muted ${TILE_ASPECT}`} />
                ))}
            </div>
            <div className="flex flex-col gap-3 pt-6 sm:gap-4 sm:pt-10">
                {[2, 3].map(index => (
                    <div key={index} className={`animate-pulse rounded-xl bg-muted ${TILE_ASPECT}`} />
                ))}
            </div>
        </div>
    );
}
