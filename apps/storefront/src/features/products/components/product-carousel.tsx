'use client';

import {ProductCard} from "@/features/products/components/product-card";
import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,} from "@/components/ui/carousel";
import {FragmentOf} from "@/platform/vendure/graphql";
import {ProductCardFragment} from '@/features/products/graphql';
import {useId} from "react";
import {StorefrontSectionHeader, StorefrontSectionLink} from '@/components/storefront-section';

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
        <section className="py-16 md:py-20">
            <div className="container mx-auto px-4">
                <StorefrontSectionHeader
                    eyebrow={eyebrow}
                    title={title}
                    description={description}
                    href={href}
                    linkLabel={linkLabel}
                />
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
                    <div className="mt-8 flex justify-center md:hidden">
                        <StorefrontSectionLink href={href}>{linkLabel}</StorefrontSectionLink>
                    </div>
                ) : null}
            </div>
        </section>
    );
}
