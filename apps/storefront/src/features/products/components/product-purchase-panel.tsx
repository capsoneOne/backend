'use client';

import {useState} from 'react';

import {ProductImageCarousel} from './product-image-carousel';
import {ProductInfo, type ProductInfoProduct, type ProductInfoVariant} from './product-info';

interface ProductPurchasePanelProps {
    product: ProductInfoProduct & {
        assets: Array<{id: string; preview: string; source: string}>;
        featuredAsset?: {id: string} | null;
    };
    searchParams: {[key: string]: string | string[] | undefined};
    currencyCode: string;
}

export function ProductPurchasePanel({product, searchParams, currencyCode}: ProductPurchasePanelProps) {
    const [variant, setVariant] = useState<ProductInfoVariant | null>(null);
    const images = variant?.assets?.length ? variant.assets : product.assets;

    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
            <div className="lg:sticky lg:top-20 lg:self-start">
                <ProductImageCarousel images={images} />
            </div>
            <div className="rounded-xl border border-border bg-card p-6 md:p-8">
                <ProductInfo
                    product={product}
                    searchParams={searchParams}
                    currencyCode={currencyCode}
                    onVariantChange={setVariant}
                    findSimilarAssetId={product.featuredAsset?.id}
                />
            </div>
        </div>
    );
}
