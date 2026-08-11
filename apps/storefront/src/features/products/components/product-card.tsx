import {FragmentOf, readFragment} from '@/platform/vendure/graphql';
import {ProductCardFragment} from '@/features/products/graphql';
import {Price} from '@/features/pricing/price';
import {ProductTile} from '@/components/product-tile';
import {QuickAddButton} from '@/features/products/quick-add-button';
import {WishlistButton} from '@/features/wishlist/wishlist-button';
import {useTranslations} from 'next-intl';

interface ProductCardProps {
    product: FragmentOf<typeof ProductCardFragment>;
    priority?: boolean;
}

export function ProductCard({product: productProp, priority}: ProductCardProps) {
    const t = useTranslations('Product');
    const product = readFragment(ProductCardFragment, productProp);
    const minPrice =
        product.priceWithTax.__typename === 'PriceRange'
            ? product.priceWithTax.min
            : product.priceWithTax.__typename === 'SinglePrice'
              ? product.priceWithTax.value
              : 0;

    return (
        <ProductTile
            href={`/product/${product.slug}`}
            imageUrl={product.productAsset?.preview}
            imageAlt={product.productName}
            title={product.productName}
            noImageLabel={t('noImage')}
            priority={priority}
            actions={
                <>
                    <WishlistButton
                        item={{
                            productId: product.productId,
                            slug: product.slug,
                            name: product.productName,
                            imageUrl: product.productAsset?.preview ?? null,
                            price: minPrice,
                            currencyCode: product.currencyCode,
                        }}
                    />
                    <QuickAddButton
                        slug={product.slug}
                        productName={product.productName}
                        productHref={`/product/${product.slug}`}
                    />
                </>
            }
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
