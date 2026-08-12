import {CataloguePageHeaderSkeleton, StorefrontPageShell} from '@/components/catalogue-page';
import {Skeleton} from '@/components/ui/skeleton';

export default function CategoriesLoading() {
    return (
        <StorefrontPageShell>
            <CataloguePageHeaderSkeleton />
            <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({length: 6}).map((_, index) => (
                    <div key={index} className="space-y-4">
                        <Skeleton className="aspect-[4/3] rounded-xl" />
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                ))}
            </div>
        </StorefrontPageShell>
    );
}
