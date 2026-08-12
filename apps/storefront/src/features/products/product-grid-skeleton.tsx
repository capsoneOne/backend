import {ProductTileSkeleton} from '@/components/product-tile';

export function ProductGridSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({length: 12}).map((_, i) => (
                    <ProductTileSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}
