'use client';

import {FragmentOf} from '@/platform/vendure/graphql';
import {MerchandiseProductFragment} from '@/features/products/graphql';
import {MerchandiseProductCard} from './merchandise-product-card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';

interface MerchandiseProductCarouselProps {
    products: Array<FragmentOf<typeof MerchandiseProductFragment>>;
    labels: {
        new: string;
        soldOut: string;
        noImage: string;
        from: string;
    };
}

export function MerchandiseProductCarousel({products, labels}: MerchandiseProductCarouselProps) {
    return (
        <Carousel opts={{align: 'start', loop: products.length > 4}} className="w-full">
            <CarouselContent className="-ml-3 md:-ml-5">
                {products.map((product, index) => (
                    <CarouselItem
                        key={index}
                        className="basis-1/2 pl-3 md:pl-5 lg:basis-1/3 xl:basis-1/4"
                    >
                        <MerchandiseProductCard product={product} labels={labels} priority={index < 4}/>
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
    );
}
