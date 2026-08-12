import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {CataloguePageHeaderSkeleton} from '@/components/catalogue-page';

export default function AddressesLoading() {
    return (
        <div>
            <CataloguePageHeaderSkeleton variant="compact" />

            <div className="space-y-6">
                <div className="flex justify-end">
                    <Skeleton className="h-11 w-40 rounded-lg" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="gap-5 border-border">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-6 w-40" />
                                        <Skeleton className="h-5 w-32" />
                                    </div>
                                    <Skeleton className="size-10 rounded-lg" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-56" />
                                    <Skeleton className="h-4 w-44" />
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
