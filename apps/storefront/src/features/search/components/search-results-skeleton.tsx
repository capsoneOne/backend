import {ProductGridSkeleton} from '@/features/products/product-grid-skeleton';

export function SearchResultsSkeleton() {
    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            {/* Filters Sidebar */}
            <aside className="lg:w-60 lg:shrink-0">
                <div className="h-64 animate-pulse rounded-lg bg-muted" />
            </aside>

            {/* Product Grid */}
            <div className="min-w-0 flex-1">
                <ProductGridSkeleton />
            </div>
        </div>
    );
}
