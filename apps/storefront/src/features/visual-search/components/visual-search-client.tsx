'use client';

import {useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode} from 'react';
import Image from 'next/image';
import {useLocale, useTranslations} from 'next-intl';
import {AlertCircle, Check, Crop, ImageUp, RotateCcw, SearchX, SlidersHorizontal} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {ProductTile, ProductTileSkeleton} from '@/components/product-tile';
import {Price} from '@/features/pricing/price';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import {VISUAL_SEARCH_MAX_FILE_BYTES, VISUAL_SEARCH_MAX_FILE_MB} from '../limits';
import type {VisualSearchErrorCode, VisualSearchHit, VisualSearchState} from '../types';
import {searchByImageUpload, searchSimilarProduct} from '../upload';
import {ImageCropper, cropFile, type CropRect} from './image-cropper';

/** Error codes are stable; the copy for them is translatable. */
const ERROR_KEYS: Record<VisualSearchErrorCode, string> = {
    NOT_IMAGE: 'errorNotImage',
    TOO_LARGE: 'errorTooLarge',
    READ_FAILED: 'errorRead',
    EMPTY: 'errorEmpty',
    UNAVAILABLE: 'errorUnavailable',
    FAILED: 'errorFailed',
};

/**
 * The viewfinder brackets. Four corners rather than a full border: a closed box
 * reads as one more card, while the open corners read as an aiming frame, which
 * is what this panel actually is.
 */
const RETICLE_CORNERS = [
    'left-4 top-4 rounded-tl-sm border-l-2 border-t-2',
    'right-4 top-4 rounded-tr-sm border-r-2 border-t-2',
    'bottom-4 left-4 rounded-bl-sm border-b-2 border-l-2',
    'bottom-4 right-4 rounded-br-sm border-b-2 border-r-2',
];

/** The scan sweep, shared by the empty frame and the uploaded photo. */
function ScanSweep({className}: {className?: string}) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'animate-scan-art pointer-events-none absolute inset-x-5 top-0 h-px',
                'bg-gradient-to-r from-transparent via-primary to-transparent',
                className,
            )}
        />
    );
}

interface InitialProduct {
    id: string;
    name: string;
    imageUrl: string | null;
    assetId?: string;
}

export function VisualSearchClient({
    initialProduct,
    heading,
}: {
    initialProduct?: InitialProduct;
    /** The page's headline block, rendered on the server beside the scanner. */
    heading?: ReactNode;
}) {
    const t = useTranslations('VisualSearch');
    const locale = useLocale();
    const [preview, setPreview] = useState<string | null>(null);
    const [state, setState] = useState<VisualSearchState>({status: 'idle'});
    const [pending, startTransition] = useTransition();
    const [dragging, setDragging] = useState(false);
    const [cropping, setCropping] = useState(false);
    const [showInitialProduct, setShowInitialProduct] = useState(!!initialProduct);
    const inputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<string | null>(null);
    /** The chosen file, kept so a crop can be re-derived from the original. */
    const fileRef = useRef<File | null>(null);
    const initialSearchStarted = useRef(false);

    // Revoke the previous object URL whenever it is replaced, and on unmount. Without
    // this every upload leaks the whole image for the lifetime of the page.
    useEffect(() => () => {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    }, []);

    const runSearch = useCallback(
        (file: File) => {
            startTransition(async () => setState(await searchByImageUpload(file, locale)));
        },
        [locale],
    );

    useEffect(() => {
        if (!initialProduct || initialSearchStarted.current) return;
        initialSearchStarted.current = true;
        startTransition(async () => setState(await searchSimilarProduct(initialProduct.id, initialProduct.assetId, locale)));
    }, [initialProduct, locale]);

    const handleFile = useCallback(
        (file: File) => {
            if (!file.type.startsWith('image/')) {
                setState({status: 'error', code: 'NOT_IMAGE'});
                return;
            }
            if (file.size > VISUAL_SEARCH_MAX_FILE_BYTES) {
                setState({status: 'error', code: 'TOO_LARGE'});
                return;
            }

            // An object URL, not a base64 data URL. FileReader would pull the whole
            // photo into a string ~37% larger than the file just to render a preview;
            // the bytes now go to the server untouched as multipart.
            if (previewRef.current) URL.revokeObjectURL(previewRef.current);
            const objectUrl = URL.createObjectURL(file);
            previewRef.current = objectUrl;
            fileRef.current = file;
            setPreview(objectUrl);
            setShowInitialProduct(false);
            setCropping(false);
            setState({status: 'idle'});

            runSearch(file);
        },
        [runSearch],
    );

    const applyCrop = useCallback(
        async (rect: CropRect) => {
            const original = fileRef.current;
            if (!original) return;
            const cropped = await cropFile(original, rect);

            if (previewRef.current) URL.revokeObjectURL(previewRef.current);
            const objectUrl = URL.createObjectURL(cropped);
            previewRef.current = objectUrl;
            setPreview(objectUrl);
            setCropping(false);
            // The crop becomes the new original, so a second crop refines the
            // first rather than reverting to the full frame.
            fileRef.current = cropped;
            runSearch(cropped);
        },
        [runSearch],
    );

    const reset = useCallback(() => {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
        fileRef.current = null;
        setPreview(null);
        setShowInitialProduct(false);
        setCropping(false);
        setState({status: 'idle'});
        // Without this the same file cannot be picked twice in a row: the input still
        // holds it, so `change` never fires again.
        if (inputRef.current) inputRef.current.value = '';
    }, []);

    const openPicker = () => inputRef.current?.click();

    const sourceImage = preview ?? (showInitialProduct ? initialProduct?.imageUrl ?? null : null);
    const hasImage = Boolean(sourceImage);

    return (
        <>
            <section className="border-b border-border bg-secondary/20 pt-[4.5rem]">
                {/* No minimum height: the scanner sets the hero's size, so the band is
                    exactly as tall as the instrument needs and the results land a
                    short scroll below it rather than under a screen of air. */}
                <div className="container mx-auto grid items-center gap-12 px-4 py-12 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
                    <div className="relative z-10 max-w-2xl">{heading}</div>

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        aria-label={t('chooseImage')}
                        className="sr-only"
                        // Focusable only through the visible button below, which forwards the click.
                        tabIndex={-1}
                        onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFile(file);
                        }}
                    />

                    <div
                        id="visual-search-upload"
                        className="animate-fade-up scroll-mt-28 [animation-delay:160ms]"
                    >
                        <div
                            onDragOver={e => {
                                e.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={e => {
                                e.preventDefault();
                                setDragging(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleFile(file);
                            }}
                            className={cn(
                                'elevate-3 relative overflow-hidden rounded-2xl border bg-card transition-colors duration-200',
                                dragging ? 'border-primary bg-accent/40' : 'border-border',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className="bg-dotfield pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_45%,black,transparent)]"
                            />

                            {RETICLE_CORNERS.map(corner => (
                                <span
                                    key={corner}
                                    aria-hidden="true"
                                    className={cn(
                                        'pointer-events-none absolute size-9 transition-colors duration-200',
                                        dragging ? 'border-primary' : 'border-primary/40',
                                        corner,
                                    )}
                                />
                            ))}

                            {/* Ambient on the empty frame — it says "put something here".
                                Once a photo is in the frame the sweep moves onto the photo
                                itself, and only while the search is actually running. */}
                            {!cropping && !hasImage ? <ScanSweep /> : null}

                            <div className="relative flex min-h-[25rem] flex-col items-center justify-center px-5 py-10 text-center sm:px-9 lg:min-h-[27rem]">
                                {preview && cropping ? (
                                    <ImageCropper src={preview} onApply={applyCrop} onCancel={() => setCropping(false)} />
                                ) : sourceImage ? (
                                    <>
                                        <div className="elevate-2 relative w-full max-w-[17rem] overflow-hidden rounded-xl bg-muted">
                                            <div className="relative aspect-square">
                                                <Image
                                                    src={sourceImage}
                                                    alt={preview ? t('yourImage') : initialProduct?.name ?? t('yourImage')}
                                                    fill
                                                    sizes="272px"
                                                    priority={!preview}
                                                    className={preview ? 'object-contain' : 'object-cover'}
                                                    unoptimized={Boolean(preview)}
                                                />
                                            </div>
                                            {pending ? <ScanSweep className="inset-x-0" /> : null}
                                        </div>

                                        {preview ? (
                                            <>
                                                <p className="mt-6 text-lg font-medium">{t('yourImage')}</p>
                                                <p className="mt-2 max-w-sm text-sm font-light leading-relaxed text-muted-foreground">
                                                    {t('previewHint')}
                                                </p>
                                                <div className="mt-6 flex flex-wrap justify-center gap-2">
                                                    <Button type="button" size="sm" onClick={() => setCropping(true)} className="min-h-11 rounded-lg">
                                                        <Crop className="mr-2 size-4" />
                                                        {t('cropImage')}
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={openPicker} className="min-h-11 rounded-lg">
                                                        <ImageUp className="mr-2 size-4" />
                                                        {t('replaceImage')}
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="sm" onClick={reset} className="min-h-11 rounded-lg">
                                                        <RotateCcw className="mr-2 size-4" />
                                                        {t('startOver')}
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="mt-6 text-sm font-medium uppercase tracking-[0.16em] text-primary">
                                                    {t('similarTo')}
                                                </p>
                                                <p className="mt-2 max-w-sm text-balance text-xl font-bold tracking-tight">
                                                    {initialProduct?.name}
                                                </p>
                                                <p className="mt-2 max-w-sm text-sm font-light leading-relaxed text-muted-foreground">
                                                    {t('similarProductHint')}
                                                </p>
                                                <Button type="button" variant="outline" size="sm" onClick={openPicker} className="mt-6 min-h-11 rounded-lg">
                                                    <ImageUp className="mr-2 size-4" />
                                                    {t('searchWithOwnImage')}
                                                </Button>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="elevate-2 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                            <ImageUp className="size-7" aria-hidden="true" />
                                        </span>
                                        <p className="mt-7 text-balance text-2xl font-bold tracking-tight">
                                            {t('dropzoneTitle')}
                                        </p>
                                        <p className="mt-2 font-light text-muted-foreground">
                                            {t('dropzoneHint', {max: VISUAL_SEARCH_MAX_FILE_MB})}
                                        </p>
                                        {/* A real button, so the flow works from the keyboard and reads
                                            correctly to a screen reader. The bare div this replaced was
                                            reachable by mouse only. */}
                                        <Button
                                            type="button"
                                            size="lg"
                                            onClick={openPicker}
                                            className="elevate-2 mt-8 h-12 rounded-lg px-8 text-base"
                                        >
                                            {t('chooseImage')}
                                        </Button>
                                        <ul className="mt-9 flex w-full max-w-md flex-wrap justify-center gap-x-5 gap-y-2 border-t border-border/70 pt-6 text-xs text-muted-foreground">
                                            {[t('photoTipOne'), t('photoTipTwo'), t('photoTipThree')].map(tip => (
                                                <li key={tip} className="flex items-center gap-1.5">
                                                    <Check className="size-3 text-primary" aria-hidden="true" />
                                                    {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Announced to assistive tech as results arrive, since the change is visual
                and happens well after the click. Collapses entirely while idle so the
                page below the scanner is the explainer, not an empty band. */}
            <div
                aria-live="polite"
                aria-atomic="false"
                className="container mx-auto px-4 py-12 empty:hidden md:py-16"
            >
                {pending && (
                    <div className="space-y-6">
                        <p className="text-sm text-muted-foreground">{t('searching')}</p>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                            {Array.from({length: 8}).map((_, i) => (
                                <ProductTileSkeleton key={i}/>
                            ))}
                        </div>
                    </div>
                )}

                {!pending && state.status === 'error' && (
                    <div
                        role="alert"
                        className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-6 py-9 text-center"
                    >
                        <AlertCircle className="size-6 text-destructive"/>
                        <p className="text-sm text-destructive">
                            {t(ERROR_KEYS[state.code], {max: VISUAL_SEARCH_MAX_FILE_MB})}
                        </p>
                        <Button type="button" variant="outline" size="sm" onClick={openPicker} className="min-h-11 rounded-lg">
                            {t('tryAnotherImage')}
                        </Button>
                    </div>
                )}

                {!pending && state.status === 'ok' && (
                    <Results
                        items={state.result.items}
                        revision={state.result.revision}
                        noImageLabel={t('noImage')}
                        onRetry={openPicker}
                    />
                )}
            </div>
        </>
    );
}

function Results({
    items,
    revision,
    noImageLabel,
    onRetry,
}: {
    items: ReadonlyArray<VisualSearchHit>;
    revision: string;
    noImageLabel: string;
    onRetry: () => void;
}) {
    const t = useTranslations('VisualSearch');
    const [minimumMatch, setMinimumMatch] = useState(0);
    const [maximumPrice, setMaximumPrice] = useState(0);
    const [sort, setSort] = useState<'match' | 'price-asc' | 'price-desc'>('match');

    const maxAvailablePrice = useMemo(
        () => Math.max(0, ...items.flatMap(item => item.product.variants.map(variant => variant.priceWithTax))),
        [items],
    );

    useEffect(() => {
        setMinimumMatch(0);
        setMaximumPrice(maxAvailablePrice);
        setSort('match');
    }, [maxAvailablePrice, revision]);

    const filteredItems = useMemo(() => {
        const result = items.filter(item => {
            const similarity = getSimilarity(item);
            const price = getMinimumPrice(item);
            const withinPrice = maximumPrice >= maxAvailablePrice || (price != null && price <= maximumPrice);
            return similarity >= minimumMatch && withinPrice;
        });

        return result.toSorted((a, b) => {
            if (sort === 'match') return a.distance - b.distance;
            const aPrice = getMinimumPrice(a) ?? Number.POSITIVE_INFINITY;
            const bPrice = getMinimumPrice(b) ?? Number.POSITIVE_INFINITY;
            return sort === 'price-asc' ? aPrice - bPrice : bPrice - aPrice;
        });
    }, [items, maxAvailablePrice, maximumPrice, minimumMatch, sort]);

    const filtersActive = minimumMatch > 0 || maximumPrice < maxAvailablePrice || sort !== 'match';
    const resetFilters = () => {
        setMinimumMatch(0);
        setMaximumPrice(maxAvailablePrice);
        setSort('match');
    };

    if (items.length === 0) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
                <div className="rounded-full bg-muted p-4">
                    <SearchX className="size-6 text-muted-foreground"/>
                </div>
                <p className="font-medium">{t('noResults')}</p>
                <p className="text-sm text-muted-foreground">{t('noResultsHint')}</p>
                <div className="mt-1 flex flex-wrap justify-center gap-3">
                    <Button type="button" variant="outline" size="lg" onClick={onRetry} className="min-h-11 rounded-lg">
                        {t('tryAnotherImage')}
                    </Button>
                    <Button nativeButton={false} render={<Link href="/search" />} size="lg" className="min-h-11 rounded-lg">
                        {t('browseCatalogue')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl" aria-live="polite">
                {t('resultsTitle', {count: filteredItems.length})}
            </h2>

            {/* A rule-bound toolbar rather than a card: the controls sit in the page's
                own grid, so the products stay the only boxed things on the screen. */}
            <section className="border-y border-border py-4" aria-labelledby="visual-result-filters-title">
                <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
                    <h3 id="visual-result-filters-title" className="flex min-h-10 items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
                        {t('filtersTitle')}
                    </h3>

                    <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="space-y-1.5 text-sm font-medium">
                            <span>{t('sortLabel')}</span>
                            <NativeSelect
                                value={sort}
                                onChange={event => setSort(event.target.value as typeof sort)}
                                className="w-full [&_select]:h-11"
                            >
                                <NativeSelectOption value="match">{t('sortBestMatch')}</NativeSelectOption>
                                <NativeSelectOption value="price-asc">{t('sortPriceAsc')}</NativeSelectOption>
                                <NativeSelectOption value="price-desc">{t('sortPriceDesc')}</NativeSelectOption>
                            </NativeSelect>
                        </label>
                        <label className="space-y-1.5 text-sm font-medium">
                            <span>{t('minimumMatchLabel')}</span>
                            <NativeSelect
                                value={String(minimumMatch)}
                                onChange={event => setMinimumMatch(Number(event.target.value))}
                                className="w-full [&_select]:h-11"
                            >
                                <NativeSelectOption value="0">{t('matchAny')}</NativeSelectOption>
                                {[60, 75, 90].map(score => (
                                    <NativeSelectOption key={score} value={String(score)}>
                                        {t('matchAtLeast', {score})}
                                    </NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </label>
                        <label className="space-y-1.5 text-sm font-medium sm:col-span-2 lg:col-span-1">
                            <span className="flex items-center justify-between gap-3">
                                {t('maximumPriceLabel')}
                                <strong className="font-bold tabular-nums">
                                    <Price value={maximumPrice} currencyCode={items[0]?.product.variants[0]?.currencyCode}/>
                                </strong>
                            </span>
                            <input
                                type="range"
                                min={0}
                                max={maxAvailablePrice}
                                step={100}
                                value={maximumPrice}
                                disabled={maxAvailablePrice === 0}
                                onChange={event => setMaximumPrice(Number(event.target.value))}
                                className="h-11 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </label>
                    </div>

                    {filtersActive ? (
                        <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="min-h-10">
                            {t('resetFilters')}
                        </Button>
                    ) : null}
                </div>
            </section>

            {filteredItems.length === 0 ? (
                <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center" role="status">
                    <div className="rounded-full bg-muted p-4">
                        <SearchX className="size-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="font-medium">{t('noFilteredResults')}</p>
                    <p className="text-sm text-muted-foreground">{t('noFilteredResultsHint')}</p>
                    <div className="mt-1 flex flex-wrap justify-center gap-3">
                        <Button type="button" variant="outline" size="lg" onClick={resetFilters} className="min-h-11 rounded-lg">
                            {t('resetFilters')}
                        </Button>
                        <Button type="button" size="lg" onClick={onRetry} className="min-h-11 rounded-lg">
                            {t('tryAnotherImage')}
                        </Button>
                    </div>
                </div>
            ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                {filteredItems.map((item, index) => {
                    const product = item.product;
                    const prices = product.variants.map(variant => variant.priceWithTax);
                    const minPrice = prices.length ? Math.min(...prices) : null;
                    const maxPrice = prices.length ? Math.max(...prices) : null;
                    const variant = product.variants.find(candidate => candidate.priceWithTax === minPrice);
                    const similarity = getSimilarity(item);
                    return (
                        <ProductTile
                            key={product.id}
                            href={`/product/${product.slug}`}
                            imageUrl={product.featuredAsset?.preview}
                            imageAlt={product.name}
                            title={product.name}
                            noImageLabel={noImageLabel}
                            priority={index < 4}
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            badge={
                                <span
                                    className={cn(
                                        'elevate-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums backdrop-blur-md',
                                        // The score is the one piece of evidence that the
                                        // match was computed rather than guessed, so it is
                                        // ranked visually the way it is ranked numerically.
                                        similarity >= 90
                                            ? 'bg-primary text-primary-foreground'
                                            : similarity >= 75
                                                ? 'bg-background/90 text-primary ring-1 ring-inset ring-primary/30'
                                                : 'bg-background/85 font-medium text-muted-foreground',
                                    )}
                                >
                                    {t('matchScore', {score: similarity})}
                                </span>
                            }
                            footer={
                                variant ? (
                                    <p className="text-[0.9375rem] font-bold tabular-nums tracking-tight">
                                        {minPrice !== maxPrice ? (
                                            <span className="mr-1 text-xs font-normal text-muted-foreground">{t('from')}</span>
                                        ) : null}
                                        <Price value={variant.priceWithTax} currencyCode={variant.currencyCode}/>
                                    </p>
                                ) : null
                            }
                        />
                    );
                })}
            </div>
            )}

            {/* Which model produced these. Kept — a stub result is otherwise
                indistinguishable from a real one — but demoted out of the shopper's way. */}
            <p className="pt-2 text-right text-[11px] text-muted-foreground/70">
                {t('modelLabel')}: <code className="font-mono">{revision}</code>
            </p>
        </div>
    );
}

function getSimilarity(item: VisualSearchHit) {
    // Cosine distance is in [0, 2]; present it as a similarity percentage.
    return Math.max(0, Math.round((1 - item.distance / 2) * 100));
}

function getMinimumPrice(item: VisualSearchHit) {
    const prices = item.product.variants.map(variant => variant.priceWithTax);
    return prices.length ? Math.min(...prices) : null;
}
