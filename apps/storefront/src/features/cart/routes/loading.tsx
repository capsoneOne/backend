import { CartSkeleton } from '@/features/cart/components/cart-skeleton';
import {CataloguePageHeaderSkeleton, StorefrontPageShell} from '@/components/catalogue-page';

export default function CartLoading() {
    return (
        <StorefrontPageShell>
            <CataloguePageHeaderSkeleton variant="compact" />
            <CartSkeleton />
        </StorefrontPageShell>
    );
}
