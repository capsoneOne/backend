import { Skeleton } from '@/components/ui/skeleton';

export function CartSkeleton() {
    return (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
            {/* Cart Items */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-4 border-b border-border p-5 last:border-b-0">
                        <Skeleton className="size-24 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-24" />
                            <div className="flex items-center gap-2 mt-2">
                                <Skeleton className="h-8 w-8" />
                                <Skeleton className="h-8 w-12" />
                                <Skeleton className="h-8 w-8" />
                            </div>
                        </div>
                        <Skeleton className="h-5 w-16" />
                    </div>
                ))}
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
                <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                    <Skeleton className="h-6 w-32" />
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                            <Skeleton className="h-5 w-12" />
                            <Skeleton className="h-5 w-20" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        </div>
    );
}
