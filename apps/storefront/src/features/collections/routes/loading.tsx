import {ProductGridSkeleton} from '@/features/products/product-grid-skeleton';
import {CataloguePageHeaderSkeleton, StorefrontPageShell} from '@/components/catalogue-page';

export default function CollectionLoading() {
    return (
        <StorefrontPageShell>
            <CataloguePageHeaderSkeleton />
            <div className="flex flex-col gap-8 lg:flex-row">
                {/* Filters Sidebar Skeleton */}
                <aside className="lg:w-60 lg:shrink-0">
                    <div className="h-64 animate-pulse rounded-lg bg-muted" />
                </aside>

                {/* Product Grid Skeleton */}
                <div className="min-w-0 flex-1">
                    <ProductGridSkeleton />
                </div>
            </div>
        </StorefrontPageShell>
    );
}
