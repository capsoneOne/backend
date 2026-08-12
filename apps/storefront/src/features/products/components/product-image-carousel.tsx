'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {useTranslations} from 'next-intl';

interface ProductImageCarouselProps {
    images: Array<{
        id: string;
        preview: string;
        source: string;
    }>;
}

export function ProductImageCarousel({ images }: ProductImageCarouselProps) {
    const t = useTranslations('Product');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => setCurrentIndex(0), [images]);

    if (!images || images.length === 0) {
        return (
            <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-muted">
                <span className="text-muted-foreground">{t('noImagesAvailable')}</span>
            </div>
        );
    }

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="space-y-4">
            {/* Main Image */}
            <div className="group relative aspect-square cursor-crosshair overflow-hidden rounded-xl border border-border bg-muted">
                <Image
                    src={images[currentIndex].source}
                    alt={t('productImage', {number: currentIndex + 1})}
                    fill
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.06]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority={currentIndex === 0}
                />

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                            onClick={goToPrevious}
                            aria-label={t('previousImage')}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                            onClick={goToNext}
                            aria-label={t('nextImage')}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </>
                )}

                {/* Image Counter */}
                {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>

            {/* Thumbnail Grid */}
            {images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            onClick={() => setCurrentIndex(index)}
                            className={`aspect-square relative rounded-xl overflow-hidden transition-all duration-300 ${
                                index === currentIndex
                                    ? 'ring-2 ring-primary ring-offset-2 scale-[1.03] shadow-md'
                                    : 'ring-1 ring-border hover:ring-primary/50 opacity-65 hover:-translate-y-1 hover:opacity-100'
                            }`}
                        >
                            <Image
                                src={image.preview}
                                alt={t('thumbnail', {number: index + 1})}
                                fill
                                className="object-cover"
                                sizes="25vw"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
