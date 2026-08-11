'use client';

import {useEffect, useRef, useState, useTransition} from 'react';
import Image from 'next/image';
import {useLocale, useTranslations} from 'next-intl';
import {AlertCircle, Camera, ImageUp, Loader2, RotateCcw, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Price} from '@/features/pricing/price';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import {VISUAL_SEARCH_MAX_FILE_BYTES, VISUAL_SEARCH_MAX_FILE_MB} from '../limits';
import {searchByImageUpload} from '../upload';
import type {VisualSearchErrorCode, VisualSearchState} from '../types';

const ERROR_KEYS: Record<VisualSearchErrorCode, string> = {
    NOT_IMAGE: 'errorNotImage',
    TOO_LARGE: 'errorTooLarge',
    READ_FAILED: 'errorRead',
    EMPTY: 'errorEmpty',
    UNAVAILABLE: 'errorUnavailable',
    FAILED: 'errorFailed',
};

export function VisualSearchQuickUpload({
    className,
    onClose,
}: {
    className?: string;
    onClose?: () => void;
}) {
    const t = useTranslations('VisualSearch');
    const locale = useLocale();
    const inputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [state, setState] = useState<VisualSearchState>({status: 'idle'});
    const [pending, startTransition] = useTransition();

    useEffect(() => () => {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    }, []);

    const chooseFile = () => inputRef.current?.click();

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setState({status: 'error', code: 'NOT_IMAGE'});
            return;
        }
        if (file.size > VISUAL_SEARCH_MAX_FILE_BYTES) {
            setState({status: 'error', code: 'TOO_LARGE'});
            return;
        }

        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        const objectUrl = URL.createObjectURL(file);
        previewRef.current = objectUrl;
        setPreview(objectUrl);
        setState({status: 'idle'});
        startTransition(async () => setState(await searchByImageUpload(file, locale, 6)));
    };

    const reset = () => {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
        setPreview(null);
        setState({status: 'idle'});
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <section className={cn('overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground elevate-2', className)}>
            <div className="flex items-start gap-3 border-b border-border px-4 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Camera className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="font-bold">{t('quickTitle')}</h2>
                    <p className="mt-0.5 text-xs font-light leading-relaxed text-muted-foreground">{t('quickSubtitle')}</p>
                </div>
                {onClose ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t('quickClose')}
                    >
                        <X className="size-4" aria-hidden="true" />
                    </button>
                ) : null}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-label={t('chooseImage')}
                onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) handleFile(file);
                }}
            />

            <div className="max-h-[min(32rem,70vh)] overflow-y-auto p-4">
                {!preview ? (
                    <div
                        onDragOver={event => {
                            event.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={event => {
                            event.preventDefault();
                            setDragging(false);
                            const file = event.dataTransfer.files?.[0];
                            if (file) handleFile(file);
                        }}
                        className={cn(
                            'flex flex-col items-center rounded-xl border border-dashed px-5 py-8 text-center transition-colors',
                            dragging ? 'border-primary bg-accent/60' : 'border-border bg-muted/35',
                        )}
                    >
                        <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <ImageUp className="size-5" aria-hidden="true" />
                        </span>
                        <p className="mt-4 font-medium">{t('quickDropTitle')}</p>
                        <p className="mt-1 text-xs font-light text-muted-foreground">
                            {t('dropzoneHint', {max: VISUAL_SEARCH_MAX_FILE_MB})}
                        </p>
                        <Button type="button" size="sm" onClick={chooseFile} className="mt-5 min-h-11 rounded-xl px-5">
                            {t('chooseImage')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-xl bg-muted/55 p-3">
                            <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-background">
                                <Image src={preview} alt={t('yourImage')} fill sizes="56px" className="object-cover" unoptimized />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{t('yourImage')}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {pending ? t('searching') : t('quickImageReady')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={reset}
                                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={t('startOver')}
                            >
                                <RotateCcw className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        {pending ? (
                            <div className="flex min-h-28 flex-col items-center justify-center gap-3 text-sm text-muted-foreground" role="status">
                                <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
                                {t('searching')}
                            </div>
                        ) : null}

                        {!pending && state.status === 'error' ? (
                            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center" role="alert">
                                <AlertCircle className="mx-auto size-5 text-destructive" aria-hidden="true" />
                                <p className="mt-2 text-xs leading-relaxed text-destructive">
                                    {t(ERROR_KEYS[state.code], {max: VISUAL_SEARCH_MAX_FILE_MB})}
                                </p>
                                <Button type="button" variant="outline" size="sm" onClick={chooseFile} className="mt-3 min-h-10 rounded-lg">
                                    {t('tryAnotherImage')}
                                </Button>
                            </div>
                        ) : null}

                        {!pending && state.status === 'ok' ? (
                            state.result.items.length ? (
                                <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                        {t('quickResults', {count: state.result.items.length})}
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {state.result.items.map(item => {
                                            const product = item.product;
                                            const variant = product.variants.toSorted((a, b) => a.priceWithTax - b.priceWithTax)[0];
                                            const match = Math.max(0, Math.round((1 - item.distance / 2) * 100));
                                            return (
                                                <Link
                                                    key={product.id}
                                                    href={`/product/${product.slug}`}
                                                    onClick={onClose}
                                                    className="group flex min-h-20 items-center gap-3 rounded-xl border border-border/70 p-2 outline-none transition-colors hover:border-primary/30 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                                                        {product.featuredAsset ? (
                                                            <Image src={product.featuredAsset.preview} alt="" fill sizes="56px" className="object-cover" />
                                                        ) : null}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-medium group-hover:text-primary">{product.name}</span>
                                                        <span className="mt-1 flex items-center justify-between gap-2 text-xs">
                                                            {variant ? <strong><Price value={variant.priceWithTax} currencyCode={variant.currencyCode} /></strong> : <span />}
                                                            <span className="text-primary">{t('matchScore', {score: match})}</span>
                                                        </span>
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-border px-4 py-7 text-center">
                                    <p className="text-sm font-medium">{t('noResults')}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{t('noResultsHint')}</p>
                                </div>
                            )
                        ) : null}
                    </div>
                )}
            </div>
        </section>
    );
}
