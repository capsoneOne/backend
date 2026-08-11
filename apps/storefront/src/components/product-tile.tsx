import Image from 'next/image';
import type {ReactNode} from 'react';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';

/**
 * The one product card in the storefront.
 *
 * It lives in `components/` rather than `features/products/components/` on purpose:
 * visual search renders the same tile from REST types, and the architecture
 * boundaries forbid one feature reaching into another feature's components. Keeping
 * the presentation here is what stops the two grids from drifting apart again.
 *
 * The image sits on its own rounded panel with the text below it, outside the
 * frame. A borderless tile lets the photography define the grid rhythm instead of
 * a lattice of boxes.
 */
interface ProductTileProps {
    href: string;
    imageUrl: string | null | undefined;
    imageAlt: string;
    title: string;
    /** Rendered under the title — a price, a range, whatever the caller has. */
    footer?: ReactNode;
    /** Pinned to the top-left of the image, e.g. a similarity score. */
    badge?: ReactNode;
    sizes?: string;
    noImageLabel: string;
    /** Set on the first row of an above-the-fold grid so the LCP image is not lazy. */
    priority?: boolean;
    className?: string;
}

export function ProductTile({
    href,
    imageUrl,
    imageAlt,
    title,
    footer,
    badge,
    sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
    noImageLabel,
    priority = false,
    className,
}: ProductTileProps) {
    return (
        <Link
            href={href}
            className={cn(
                'group flex h-full flex-col rounded-2xl outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background',
                className,
            )}
        >
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted transition-all duration-500 group-hover:elevate-3">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={imageAlt}
                        fill
                        priority={priority}
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                        sizes={sizes}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm font-light text-muted-foreground">
                        {noImageLabel}
                    </div>
                )}

                {/* Inner hairline keeps pale product shots from bleeding into a pale page. */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/[0.06]" />

                {badge ? <div className="absolute left-3 top-3 z-10">{badge}</div> : null}
            </div>

            <div className="flex flex-1 flex-col gap-1 px-1 pb-1 pt-3.5">
                <h3 className="line-clamp-2 text-[0.9375rem] leading-snug transition-colors group-hover:text-primary">
                    {title}
                </h3>
                {footer ? <div className="mt-auto pt-0.5">{footer}</div> : null}
            </div>
        </Link>
    );
}

/** Matching placeholder, so skeletons and real tiles share a silhouette. */
export function ProductTileSkeleton() {
    return (
        <div className="flex flex-col">
            <div className="aspect-square animate-pulse rounded-2xl bg-muted" />
            <div className="space-y-2 px-1 pt-3.5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
            </div>
        </div>
    );
}
