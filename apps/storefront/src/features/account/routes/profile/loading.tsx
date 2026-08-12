import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {CataloguePageHeaderSkeleton} from '@/components/catalogue-page';

export default function ProfileLoading() {
    return (
        <div>
            <CataloguePageHeaderSkeleton variant="compact" />

            <div className="space-y-6">
                {[2, 3, 3].map((fieldCount, cardIndex) => (
                    <Card key={cardIndex} className="gap-5 border-border">
                        <CardHeader>
                            <CardTitle><Skeleton className="h-5 w-40" /></CardTitle>
                            <CardDescription><Skeleton className="h-4 w-64" /></CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Array.from({length: fieldCount}, (_, index) => (
                                <div key={index} className="space-y-2">
                                    <Skeleton className="h-4 w-32"/>
                                    <Skeleton className="h-10 w-full"/>
                                </div>
                            ))}
                            <Skeleton className="h-11 w-36 rounded-lg"/>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
