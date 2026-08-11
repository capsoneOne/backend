'use client';

import {useCallback, useEffect, useRef, useState, useTransition} from 'react';
import Image from 'next/image';
import {useLocale, useTranslations} from 'next-intl';
import {AlertCircle, Crop, ImageUp, RotateCcw, SearchX} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ProductTile, ProductTileSkeleton} from '@/components/product-tile';
import {Price} from '@/features/pricing/price';
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

interface InitialProduct {
    id: string;
    name: string;
    imageUrl: string | null;
    assetId?: string;
}

export function VisualSearchClient({initialProduct}: {initialProduct?: InitialProduct}) {
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

    return (
        <div className="space-y-10">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                // Focusable only through the visible button below, which forwards the click.
                tabIndex={-1}
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                }}
            />

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
                className={`relative mx-auto max-w-3xl overflow-hidden rounded-3xl border bg-card p-8 transition-all duration-300 sm:p-12 ${
                    dragging
                        ? 'border-primary bg-accent/40 elevate-3'
                        : 'border-border elevate-2 hover:elevate-3'
                }`}
            >
                <div className="pointer-events-none absolute inset-0 bg-dotfield opacity-60 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black,transparent)]" />

                {preview && cropping ? (
                    <div className="relative">
                        <ImageCropper src={preview} onApply={applyCrop} onCancel={() => setCropping(false)} />
                    </div>
                ) : preview ? (
                    <div className="relative flex flex-col items-center gap-7 sm:flex-row sm:items-center sm:justify-center">
                        <div className="relative size-44 shrink-0 overflow-hidden rounded-2xl bg-muted elevate-2">
                            <Image src={preview} alt={t('yourImage')} fill className="object-contain" unoptimized/>
                        </div>
                        <div className="space-y-3 text-center sm:text-left">
                            <p className="text-lg font-medium">{t('yourImage')}</p>
                            <p className="max-w-xs font-light text-muted-foreground">{t('previewHint')}</p>
                            <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
                                <Button type="button" variant="default" size="sm" onClick={() => setCropping(true)} className="rounded-full">
                                    <Crop className="mr-2 size-4"/>
                                    {t('cropImage')}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={openPicker} className="rounded-full">
                                    <ImageUp className="mr-2 size-4"/>
                                    {t('replaceImage')}
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={reset} className="rounded-full">
                                    <RotateCcw className="mr-2 size-4"/>
                                    {t('startOver')}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : showInitialProduct && initialProduct ? (
                    <div className="relative flex flex-col items-center gap-7 sm:flex-row sm:justify-center">
                        <div className="relative size-44 shrink-0 overflow-hidden rounded-2xl bg-muted elevate-2">
                            {initialProduct.imageUrl ? (
                                <Image src={initialProduct.imageUrl} alt={initialProduct.name} fill className="object-cover" />
                            ) : null}
                        </div>
                        <div className="max-w-sm space-y-3 text-center sm:text-left">
                            <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">{t('similarTo')}</p>
                            <p className="text-xl font-semibold">{initialProduct.name}</p>
                            <p className="font-light text-muted-foreground">{t('similarProductHint')}</p>
                            <Button type="button" variant="outline" size="sm" onClick={openPicker} className="rounded-full">
                                <ImageUp className="mr-2 size-4" />
                                {t('searchWithOwnImage')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="relative flex flex-col items-center text-center">
                        <div className="flex size-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                            <ImageUp className="size-7"/>
                        </div>
                        <p className="mt-6 text-xl font-medium">{t('dropzoneTitle')}</p>
                        <p className="mt-1.5 font-light text-muted-foreground">
                            {t('dropzoneHint', {max: VISUAL_SEARCH_MAX_FILE_MB})}
                        </p>
                        {/* A real button, so the flow works from the keyboard and reads
                            correctly to a screen reader. The bare div this replaced was
                            reachable by mouse only. */}
                        <Button
                            type="button"
                            size="lg"
                            onClick={openPicker}
                            className="mt-7 h-12 rounded-full px-7 text-base elevate-2"
                        >
                            {t('chooseImage')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Announced to assistive tech as results arrive, since the change is visual
                and happens well after the click. */}
            <div aria-live="polite" aria-atomic="false">
                {pending && (
                    <div className="space-y-4">
                        <p className="text-center text-sm text-muted-foreground">{t('searching')}</p>
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
                        <Button type="button" variant="outline" size="sm" onClick={openPicker} className="rounded-full">
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
        </div>
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

    if (items.length === 0) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
                <div className="rounded-full bg-muted p-4">
                    <SearchX className="size-6 text-muted-foreground"/>
                </div>
                <p className="font-medium">{t('noResults')}</p>
                <p className="text-sm text-muted-foreground">{t('noResultsHint')}</p>
                <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-1 rounded-full">
                    {t('tryAnotherImage')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
                <h2 className="text-lg font-medium">{t('resultsTitle', {count: items.length})}</h2>
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                {items.map(item => {
                    const product = item.product;
                    const variant = product.variants[0];
                    // Cosine distance is in [0, 2]; present it as a similarity percentage.
                    const similarity = Math.max(0, Math.round((1 - item.distance / 2) * 100));
                    return (
                        <ProductTile
                            key={product.id}
                            href={`/product/${product.slug}`}
                            imageUrl={product.featuredAsset?.preview}
                            imageAlt={product.name}
                            title={product.name}
                            noImageLabel={noImageLabel}
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            badge={
                                <span className="rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground elevate-1 backdrop-blur-md">
                                    {t('matchScore', {score: similarity})}
                                </span>
                            }
                            footer={
                                variant ? (
                                    <p className="text-[0.9375rem] font-bold tracking-tight">
                                        <Price value={variant.priceWithTax} currencyCode={variant.currencyCode}/>
                                    </p>
                                ) : null
                            }
                        />
                    );
                })}
            </div>

            {/* Which model produced these. Kept — a stub result is otherwise
                indistinguishable from a real one — but demoted out of the shopper's way. */}
            <p className="pt-2 text-right text-[11px] text-muted-foreground/70">
                {t('modelLabel')}: <code className="font-mono">{revision}</code>
            </p>
        </div>
    );
}
