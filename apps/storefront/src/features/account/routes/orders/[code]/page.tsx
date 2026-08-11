import type {Metadata} from 'next';
import {Suspense} from 'react';
import {query} from '@/platform/vendure/api';
import {GetOrderDetailQuery} from '@/features/account/graphql';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {OrderDetail} from './order-detail';
import {CataloguePageHeaderSkeleton} from '@/components/catalogue-page';
import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';

type OrderDetailPageProps = PageProps<'/[locale]/account/orders/[code]'>;

function OrderDetailLoading() {
    return (
        <div>
            <CataloguePageHeaderSkeleton variant="compact" />
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="gap-5 border-border lg:col-span-2">
                    <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({length: 3}, (_, index) => (
                            <div key={index} className="flex gap-4">
                                <Skeleton className="size-20 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card className="gap-5 border-border">
                    <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export async function generateMetadata({params}: OrderDetailPageProps): Promise<Metadata> {
    const {code} = await params;
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});
    return {
        title: t('order', {code}),
    };
}

export default async function OrderDetailPage(props: OrderDetailPageProps) {
    // Start the fetch in the page (dynamic parent) and pass promise into Suspense.
    const orderPromise = props.params.then(({code}) =>
        query(GetOrderDetailQuery, {code}, {useAuthToken: true, fetch: {}})
    );

    return (
        <Suspense fallback={<OrderDetailLoading />}>
            <OrderDetail orderPromise={orderPromise} />
        </Suspense>
    );
}
