import {CataloguePageHeaderSkeleton} from '@/components/catalogue-page';
import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';

export default function SettingsLoading() {
    return (
        <div>
            <CataloguePageHeaderSkeleton variant="compact" />
            <div className="space-y-6">
                {[3, 2, 2].map((itemCount, cardIndex) => (
                    <Card key={cardIndex} className="gap-5 border-border">
                        <CardHeader>
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-full max-w-md" />
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-3">
                            {Array.from({length: itemCount}, (_, index) => (
                                <Skeleton key={index} className="h-20 rounded-xl" />
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
