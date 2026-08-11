import {FragmentOf, readFragment} from '@/platform/vendure/graphql';
import {ProductCardFragment} from '@/features/products/graphql';
import {Price} from '@/features/pricing/price';
import {ProductTile} from '@/components/product-tile';
import {useTranslations} from 'next-intl';

interface ProductCardProps {
    product: FragmentOf<typeof ProductCardFragment>;
    priority?: boolean;
}

export function ProductCard({product: productProp, priority}: ProductCardProps) {
    const t = useTranslations('Product');
    const product = readFragment(ProductCardFragment, productProp);

    return (
        <ProductTile
            href={`/product/${product.slug}`}
            imageUrl={product.productAsset?.preview}
            imageAlt={product.productName}
            title={product.productName}
            noImageLabel={t('noImage')}
            priority={priority}
            footer={
                <p className="text-[0.9375rem] font-bold tracking-tight">
                    {product.priceWithTax.__typename === 'PriceRange' ? (
                        product.priceWithTax.min !== product.priceWithTax.max ? (
                            <>
                                <span className="mr-1 text-xs font-normal text-muted-foreground">{t('from')}</span>
                                <Price value={product.priceWithTax.min} currencyCode={product.currencyCode}/>
                            </>
                        ) : (
                            <Price value={product.priceWithTax.min} currencyCode={product.currencyCode}/>
                        )
                    ) : product.priceWithTax.__typename === 'SinglePrice' ? (
                        <Price value={product.priceWithTax.value} currencyCode={product.currencyCode}/>
                    ) : null}
                </p>
            }
        />
    );
}
