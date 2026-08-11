import { Skeleton } from '@/components/ui/skeleton';
import {CataloguePageHeaderSkeleton, StorefrontPageShell} from '@/components/catalogue-page';

export default function CheckoutLoading() {
    return (
        <StorefrontPageShell>
            <div className="mx-auto max-w-6xl">
                <CataloguePageHeaderSkeleton />

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
                {/* Checkout Steps */}
                <div className="order-2 space-y-6 lg:order-1">
                    {/* Step Indicator */}
                    <div className="mb-6 hidden items-center justify-between rounded-xl border border-border bg-card px-6 py-5 sm:flex">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                {i < 3 && <Skeleton className="h-1 w-16 mx-2" />}
                            </div>
                        ))}
                    </div>

                    {/* Shipping Address Form */}
                    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                        <Skeleton className="h-6 w-40" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="order-1 lg:order-2">
                    <div className="sticky top-24 space-y-4 rounded-xl border border-border bg-card p-6">
                        <Skeleton className="h-6 w-32" />

                        {/* Order Items */}
                        <div className="space-y-3">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="h-16 w-16 rounded-md" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <div className="flex justify-between font-bold pt-2 border-t">
                                <Skeleton className="h-5 w-12" />
                                <Skeleton className="h-5 w-20" />
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </StorefrontPageShell>
    );
}
