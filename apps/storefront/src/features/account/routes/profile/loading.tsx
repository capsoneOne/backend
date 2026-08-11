import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {CataloguePageHeaderSkeleton} from '@/components/catalogue-page';

export default function ProfileLoading() {
    return (
        <div>
            <CataloguePageHeaderSkeleton variant="compact" />

            <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>
                        Your personal details
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm font-medium">Email</p>
                        <Skeleton className="h-4 w-48 mt-1"/>
                    </div>
                    <div>
                        <p className="text-sm font-medium">Name</p>
                        <Skeleton className="h-4 w-32 mt-1"/>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                        Update your password
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32"/>
                        <Skeleton className="h-10 w-full"/>
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32"/>
                        <Skeleton className="h-10 w-full"/>
                    </div>
                    <Skeleton className="h-10 w-32"/>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}
