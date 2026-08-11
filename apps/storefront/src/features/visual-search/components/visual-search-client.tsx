'use client';

import {useCallback, useEffect, useRef, useState, useTransition} from 'react';
import Image from 'next/image';
import {useLocale, useTranslations} from 'next-intl';
import {Link} from '@/platform/i18n/navigation';
import {Price} from '@/features/pricing/price';
import {VISUAL_SEARCH_MAX_FILE_BYTES, VISUAL_SEARCH_MAX_FILE_MB} from '../limits';
import type {VisualSearchErrorCode, VisualSearchHit, VisualSearchState} from '../types';
import {searchByImageUpload} from '../upload';

/** Error codes are stable; the copy for them is translatable. */
const ERROR_KEYS: Record<VisualSearchErrorCode, string> = {
    NOT_IMAGE: 'errorNotImage',
    TOO_LARGE: 'errorTooLarge',
    READ_FAILED: 'errorRead',
    EMPTY: 'errorEmpty',
    UNAVAILABLE: 'errorUnavailable',
    FAILED: 'errorFailed',
};

export function VisualSearchClient() {
    const t = useTranslations('VisualSearch');
    const locale = useLocale();
    const [preview, setPreview] = useState<string | null>(null);
    const [state, setState] = useState<VisualSearchState>({status: 'idle'});
    const [pending, startTransition] = useTransition();
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<string | null>(null);

    // Revoke the previous object URL whenever it is replaced, and on unmount. Without
    // this every upload leaks the whole image for the lifetime of the page.
    useEffect(() => () => {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    }, []);

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
            setPreview(objectUrl);
            setState({status: 'idle'});

            startTransition(async () => setState(await searchByImageUpload(file, locale)));
        },
        [locale],
    );

    return (
        <div className="space-y-8">
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
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                    dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    // `capture` makes mobile browsers offer the camera directly.
                    capture="environment"
                    className="hidden"
                    onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                    }}
                />
                {preview ? (
                    <div className="mx-auto relative h-48 w-48">
                        <Image src={preview} alt={t('yourImage')} fill className="object-contain" unoptimized />
                    </div>
                ) : (
                    <>
                        <p className="font-medium">{t('dropzoneTitle')}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('dropzoneHint', {max: VISUAL_SEARCH_MAX_FILE_MB})}
                        </p>
                    </>
                )}
            </div>

            {pending && <p className="text-center text-muted-foreground">{t('searching')}</p>}

            {state.status === 'error' && (
                <p className="text-center text-destructive">
                    {t(ERROR_KEYS[state.code], {max: VISUAL_SEARCH_MAX_FILE_MB})}
                </p>
            )}

            {state.status === 'ok' && !pending && (
                <Results
                    items={state.result.items}
                    revision={state.result.revision}
                    emptyLabel={t('noResults')}
                    matchLabel={t('match')}
                    modelLabel={t('modelLabel')}
                />
            )}
        </div>
    );
}

function Results({
    items,
    revision,
    emptyLabel,
    matchLabel,
    modelLabel,
}: {
    items: ReadonlyArray<VisualSearchHit>;
    revision: string;
    emptyLabel: string;
    matchLabel: string;
    modelLabel: string;
}) {
    if (items.length === 0) {
        return <p className="text-center text-muted-foreground">{emptyLabel}</p>;
    }
    return (
        <div className="space-y-4">
            {/* Which model produced these. Without it a stub result is indistinguishable
                from a real one — see the embedding service contract. */}
            <p className="text-xs text-muted-foreground text-right">
                {modelLabel}: <code>{revision}</code>
            </p>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                {items.map(item => {
                    const product = item.product;
                    const variant = product.variants[0];
                    // Cosine distance is in [0, 2]; present it as a similarity percentage.
                    const similarity = Math.max(0, Math.round((1 - item.distance / 2) * 100));
                    return (
                        <Link
                            key={product.id}
                            href={`/product/${product.slug}`}
                            className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                            <div className="relative aspect-square overflow-hidden bg-muted">
                                {product.featuredAsset && (
                                    <Image
                                        src={product.featuredAsset.preview}
                                        alt={product.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    />
                                )}
                                <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium">
                                    {similarity}% {matchLabel}
                                </span>
                            </div>
                            <div className="space-y-1 p-4">
                                <h3 className="line-clamp-2 font-medium leading-snug group-hover:text-primary">
                                    {product.name}
                                </h3>
                                {variant && (
                                    <p className="text-sm text-muted-foreground">
                                        <Price value={variant.priceWithTax} currencyCode={variant.currencyCode} />
                                    </p>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
