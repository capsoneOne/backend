'use client';

import {useCallback, useRef, useState, useTransition} from 'react';
import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {Link} from '@/platform/i18n/navigation';
import {readFragment, type FragmentOf} from '@/platform/vendure/graphql';
import {Price} from '@/features/pricing/price';
import {searchByImageAction, type VisualSearchState} from '../actions';
import {VisualSearchCardFragment} from '../graphql';

/**
 * Upload is capped client-side. A phone photo travels to the Shop API as base64
 * (~33% overhead) because the storefront transport is a plain JSON POST with no
 * multipart support, so an unbounded file would exceed the server's body limit.
 * The cap rejects loudly rather than failing with an opaque 413.
 */
const MAX_BYTES = 4 * 1024 * 1024;

export function VisualSearchClient() {
    const t = useTranslations('VisualSearch');
    const [preview, setPreview] = useState<string | null>(null);
    const [state, setState] = useState<VisualSearchState>({status: 'idle'});
    const [pending, startTransition] = useTransition();
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(
        (file: File) => {
            if (!file.type.startsWith('image/')) {
                setState({status: 'error', message: t('errorNotImage')});
                return;
            }
            if (file.size > MAX_BYTES) {
                setState({status: 'error', message: t('errorTooLarge')});
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                setPreview(dataUrl);
                setState({status: 'idle'});
                // The resolver strips the data: prefix, so it is sent as-is.
                startTransition(async () => setState(await searchByImageAction(dataUrl)));
            };
            reader.onerror = () => setState({status: 'error', message: t('errorRead')});
            reader.readAsDataURL(file);
        },
        [t],
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
                        <p className="text-sm text-muted-foreground mt-1">{t('dropzoneHint')}</p>
                    </>
                )}
            </div>

            {pending && <p className="text-center text-muted-foreground">{t('searching')}</p>}

            {state.status === 'error' && (
                <p className="text-center text-destructive">{t('errorPrefix')}: {state.message}</p>
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
    items: ReadonlyArray<{distance: number; product: FragmentOf<typeof VisualSearchCardFragment>}>;
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
                    const product = readFragment(VisualSearchCardFragment, item.product);
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
