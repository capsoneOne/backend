'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {Check, RotateCcw} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';

/**
 * Drag-to-crop, run before the photo is uploaded.
 *
 * This is the highest-leverage control in image search: the embedding is
 * computed over the *whole* frame, so a boot photographed on a patterned rug is
 * partly a query for the rug. Letting the shopper box the product removes that
 * noise at the source, which no amount of ranking downstream can recover.
 *
 * The crop is applied with a canvas at the image's natural resolution, so
 * cropping does not also downscale the photo.
 */
export interface CropRect {
    /** Fractions of natural width/height, in [0, 1]. */
    x: number;
    y: number;
    width: number;
    height: number;
}

const MIN_SIZE = 0.08;

export function ImageCropper({
    src,
    onApply,
    onCancel,
}: {
    src: string;
    onApply: (rect: CropRect) => void;
    onCancel: () => void;
}) {
    const t = useTranslations('VisualSearch');
    const frameRef = useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState<CropRect>({x: 0.1, y: 0.1, width: 0.8, height: 0.8});
    const dragRef = useRef<{startX: number; startY: number; origin: CropRect; mode: 'move' | 'draw'} | null>(null);

    const toFraction = useCallback((clientX: number, clientY: number) => {
        const frame = frameRef.current;
        if (!frame) return {x: 0, y: 0};
        const bounds = frame.getBoundingClientRect();
        return {
            x: Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width)),
            y: Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height)),
        };
    }, []);

    const onPointerDown = (event: React.PointerEvent, mode: 'move' | 'draw') => {
        event.preventDefault();
        event.stopPropagation();
        (event.target as Element).setPointerCapture?.(event.pointerId);
        const point = toFraction(event.clientX, event.clientY);
        dragRef.current = {startX: point.x, startY: point.y, origin: rect, mode};
        if (mode === 'draw') {
            setRect({x: point.x, y: point.y, width: 0, height: 0});
        }
    };

    const onPointerMove = (event: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const point = toFraction(event.clientX, event.clientY);

        if (drag.mode === 'draw') {
            setRect({
                x: Math.min(drag.startX, point.x),
                y: Math.min(drag.startY, point.y),
                width: Math.abs(point.x - drag.startX),
                height: Math.abs(point.y - drag.startY),
            });
            return;
        }

        // Moving: clamp so the box stays fully inside the image.
        const dx = point.x - drag.startX;
        const dy = point.y - drag.startY;
        setRect({
            ...drag.origin,
            x: Math.min(1 - drag.origin.width, Math.max(0, drag.origin.x + dx)),
            y: Math.min(1 - drag.origin.height, Math.max(0, drag.origin.y + dy)),
        });
    };

    const onPointerUp = () => {
        dragRef.current = null;
        // A stray click leaves a degenerate box; snap back rather than submit it.
        setRect(current =>
            current.width < MIN_SIZE || current.height < MIN_SIZE
                ? {x: 0.1, y: 0.1, width: 0.8, height: 0.8}
                : current,
        );
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onCancel]);

    return (
        <div className="relative space-y-5">
            <div
                ref={frameRef}
                onPointerDown={event => onPointerDown(event, 'draw')}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="relative mx-auto max-h-[60vh] w-fit touch-none select-none overflow-hidden rounded-2xl bg-muted"
            >
                {/* Intentionally a plain <img>: this is an object URL of a local file
                    at unknown dimensions, which next/image cannot optimise anyway. */}
                <img src={src} alt={t('yourImage')} className="max-h-[60vh] w-auto object-contain" draggable={false} />

                {/* Dim everything outside the selection. */}
                <div
                    className="pointer-events-none absolute inset-0 bg-foreground/50"
                    style={{
                        clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${rect.x * 100}% ${rect.y * 100}%, ${rect.x * 100}% ${(rect.y + rect.height) * 100}%, ${(rect.x + rect.width) * 100}% ${(rect.y + rect.height) * 100}%, ${(rect.x + rect.width) * 100}% ${rect.y * 100}%, ${rect.x * 100}% ${rect.y * 100}%)`,
                    }}
                />

                <div
                    onPointerDown={event => onPointerDown(event, 'move')}
                    className="absolute cursor-move border-2 border-primary"
                    style={{
                        left: `${rect.x * 100}%`,
                        top: `${rect.y * 100}%`,
                        width: `${rect.width * 100}%`,
                        height: `${rect.height * 100}%`,
                    }}
                >
                    <span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-primary" />
                    <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />
                    <span className="absolute -bottom-1 -left-1 size-2.5 rounded-full bg-primary" />
                    <span className="absolute -bottom-1 -right-1 size-2.5 rounded-full bg-primary" />
                </div>
            </div>

            <p className="text-center text-sm font-light text-muted-foreground">{t('cropHint')}</p>

            <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" onClick={() => onApply(rect)} className="rounded-full px-6">
                    <Check className="mr-2 size-4" />
                    {t('cropApply')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRect({x: 0.1, y: 0.1, width: 0.8, height: 0.8})}
                    className="rounded-full"
                >
                    <RotateCcw className="mr-2 size-4" />
                    {t('cropReset')}
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel} className="rounded-full">
                    {t('cropCancel')}
                </Button>
            </div>
        </div>
    );
}

/**
 * Produce a cropped JPEG from the original file.
 *
 * Returns the original file untouched if the canvas cannot be read — better a
 * full-frame search than a failed one.
 */
export async function cropFile(file: File, rect: CropRect): Promise<File> {
    try {
        const bitmap = await createImageBitmap(file);
        const sx = Math.round(rect.x * bitmap.width);
        const sy = Math.round(rect.y * bitmap.height);
        const sw = Math.max(1, Math.round(rect.width * bitmap.width));
        const sh = Math.max(1, Math.round(rect.height * bitmap.height));

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const context = canvas.getContext('2d');
        if (!context) return file;
        context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
        bitmap.close();

        const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/jpeg', 0.92),
        );
        if (!blob) return file;

        return new File([blob], file.name.replace(/\.\w+$/, '') + '-crop.jpg', {
            type: 'image/jpeg',
        });
    } catch {
        return file;
    }
}
