import { CartSkeleton } from '@/features/cart/components/cart-skeleton';
import {CataloguePageHeaderSkeleton, StorefrontPageShell} from '@/components/catalogue-page';

export default function CartLoading() {
    return (
        <StorefrontPageShell>
            <div className="mx-auto max-w-6xl">
                <CataloguePageHeaderSkeleton />
                <CartSkeleton />
            </div>
        </StorefrontPageShell>
    );
}
