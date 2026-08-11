import {FragmentOf, readFragment} from '@/platform/vendure/graphql';
import {ProductTile} from '@/components/product-tile';
import {Price} from '@/features/pricing/price';
import {QuickAddButton} from '@/features/products/quick-add-button';
import {WishlistButton} from '@/features/wishlist/wishlist-button';
import {MerchandiseProductFragment} from '@/features/products/graphql';

interface MerchandiseProductCardProps {
    product: FragmentOf<typeof MerchandiseProductFragment>;
    labels: {
        new: string;
        soldOut: string;
        noImage: string;
        from: string;
    };
    priority?: boolean;
}

export function MerchandiseProductCard({product: productProp, labels, priority}: MerchandiseProductCardProps) {
    const product = readFragment(MerchandiseProductFragment, productProp);
    const variants = product.variants;
    if (variants.length === 0) return null;

    const prices = variants.map(variant => variant.priceWithTax);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const currencyCode = variants[0].currencyCode;
    const inStock = variants.some(variant => variant.stockLevel !== 'OUT_OF_STOCK');

    return (
        <ProductTile
            href={`/product/${product.slug}`}
            imageUrl={product.featuredAsset?.preview}
            imageAlt={product.name}
            title={product.name}
            noImageLabel={labels.noImage}
            priority={priority}
            badge={
                <span className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground elevate-1 backdrop-blur-md">
                    {inStock ? labels.new : labels.soldOut}
                </span>
            }
            actions={
                <>
                    <WishlistButton
                        item={{
                            productId: product.id,
                            slug: product.slug,
                            name: product.name,
                            imageUrl: product.featuredAsset?.preview ?? null,
                            price: minPrice,
                            currencyCode,
                        }}
                    />
                    {inStock ? (
                        <QuickAddButton
                            slug={product.slug}
                            productName={product.name}
                            productHref={`/product/${product.slug}`}
                        />
                    ) : null}
                </>
            }
            footer={
                <p className="text-[0.9375rem] font-bold tracking-tight">
                    {minPrice !== maxPrice ? (
                        <span className="mr-1 text-xs font-normal text-muted-foreground">{labels.from}</span>
                    ) : null}
                    <Price value={minPrice} currencyCode={currencyCode}/>
                </p>
            }
        />
    );
}
