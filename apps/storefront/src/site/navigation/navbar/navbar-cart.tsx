import {cacheLife, cacheTag} from 'next/cache';
import {CartDrawer, type CartDrawerLine} from './cart-drawer';
import {query} from '@/platform/vendure/api';
import {GetActiveOrderQuery} from '@/features/cart/graphql';

export async function NavbarCart() {
    'use cache: private';
    cacheLife('minutes');
    cacheTag('cart');
    cacheTag('active-order');

    const orderResult = await query(GetActiveOrderQuery, undefined, {
        useAuthToken: true,
        tags: ['cart'],
    });

    const order = orderResult.data.activeOrder;

    // Flattened here rather than in the drawer: the client component should not
    // have to know the shape of a Vendure order line.
    const lines: CartDrawerLine[] = (order?.lines ?? []).map(line => ({
        id: line.id,
        name: line.productVariant.product.name,
        slug: line.productVariant.product.slug,
        imageUrl: line.productVariant.product.featuredAsset?.preview ?? null,
        quantity: line.quantity,
        linePriceWithTax: line.linePriceWithTax,
    }));

    return (
        <CartDrawer
            lines={lines}
            itemCount={order?.totalQuantity ?? 0}
            subTotalWithTax={order?.subTotalWithTax ?? 0}
            currencyCode={order?.currencyCode ?? 'USD'}
        />
    );
}
