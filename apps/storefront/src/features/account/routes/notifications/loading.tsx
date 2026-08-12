import {CataloguePageHeaderSkeleton, StorefrontPageShell} from '@/components/catalogue-page';
import {Skeleton} from '@/components/ui/skeleton';

export default function NotificationsLoading() {
    return (
        <StorefrontPageShell>
            <div className="mx-auto max-w-4xl">
                <CataloguePageHeaderSkeleton />
                <div className="overflow-hidden rounded-xl border border-border">
                    {Array.from({length: 4}).map((_, index) => (
                        <div key={index} className="flex min-h-24 items-center gap-4 border-b border-border px-6 py-4 last:border-0">
                            <Skeleton className="size-11 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-36" />
                            </div>
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </StorefrontPageShell>
    );
}
