'use client';

import {ProductCard} from "@/features/products/components/product-card";
import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,} from "@/components/ui/carousel";
import {FragmentOf} from "@/platform/vendure/graphql";
import {ProductCardFragment} from '@/features/products/graphql';
import {useId} from "react";
import {Link} from '@/platform/i18n/navigation';
import {ArrowRight} from 'lucide-react';

interface ProductCarouselClientProps {
    title: string;
    products: Array<FragmentOf<typeof ProductCardFragment>>;
    eyebrow?: string;
    description?: string;
    href?: string;
    linkLabel?: string;
    badgeLabel?: string;
}

export function ProductCarousel({
    title,
    products,
    eyebrow,
    description,
    href,
    linkLabel,
    badgeLabel,
}: ProductCarouselClientProps) {
    const id = useId();

    return (
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                <div className="mb-10 flex items-end justify-between gap-6">
                    <div>
                        {eyebrow ? (
                            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
                        ) : null}
                        <h2 className={eyebrow ? 'mt-3 text-3xl font-bold md:text-4xl' : 'text-2xl font-bold md:text-3xl'}>
                            {title}
                        </h2>
                        {description ? (
                            <p className="mt-3 max-w-xl font-light text-muted-foreground">{description}</p>
                        ) : null}
                    </div>
                    {href && linkLabel ? (
                        <Link href={href} className="hidden items-center gap-2 text-sm font-medium text-primary hover:underline md:flex">
                            {linkLabel}
                            <ArrowRight className="size-4"/>
                        </Link>
                    ) : null}
                </div>
                <Carousel
                    opts={{
                        align: "start",
                        loop: products.length > 4,
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-3 md:-ml-5">
                        {products.map((product, i) => (
                            <CarouselItem key={id + i}
                                          className="basis-1/2 pl-3 sm:basis-1/2 md:pl-5 lg:basis-1/3 xl:basis-1/4">
                                <ProductCard product={product} badgeLabel={badgeLabel}/>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {products.length > 4 ? (
                        <>
                            <CarouselPrevious className="hidden md:flex"/>
                            <CarouselNext className="hidden md:flex"/>
                        </>
                    ) : null}
                </Carousel>
                {href && linkLabel ? (
                    <Link href={href} className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline md:hidden">
                        {linkLabel}
                        <ArrowRight className="size-4"/>
                    </Link>
                ) : null}
            </div>
        </section>
    );
}
