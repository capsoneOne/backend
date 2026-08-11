import type {Metadata} from 'next';
import Image from 'next/image';
import {ChevronRight, PackageCheck} from 'lucide-react';
import {getTranslations} from 'next-intl/server';
import {StorefrontPageHeader, StorefrontPageShell} from '@/components/catalogue-page';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {noIndexRobots} from '@/config/metadata';
import {GetCustomerOrdersQuery} from '@/features/account/graphql';
import {OrderStatusBadge} from '@/features/orders/order-status-badge';
import {Link, redirect} from '@/platform/i18n/navigation';
import {formatDate} from '@/platform/i18n/format';
import {getRouteLocale} from '@/platform/i18n/server';
import {query} from '@/platform/vendure/api';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});
    return {
        title: t('notificationsPageTitle'),
        robots: noIndexRobots(),
    };
}

/** A real activity feed derived from the shopper's latest order updates. */
export default async function NotificationsPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});
    const {data} = await query(
        GetCustomerOrdersQuery,
        {
            options: {
                take: 20,
                sort: {updatedAt: 'DESC'},
                filter: {state: {notEq: 'AddingItems'}},
            },
        },
        {useAuthToken: true},
    );

    if (!data.activeCustomer) {
        return redirect({href: '/sign-in?redirectTo=/notifications', locale});
    }

    const orders = data.activeCustomer.orders.items;

    return (
        <StorefrontPageShell>
            <div className="mx-auto max-w-4xl">
                <StorefrontPageHeader
                    eyebrow={t('notificationsEmptyEyebrow')}
                    title={t('notifications')}
                    description={t('notificationsDescription')}
                />

                {orders.length === 0 ? (
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            <div className="relative flex min-h-72 items-center justify-center bg-secondary/45 p-7 sm:p-9">
                                <Image
                                    src="/storyset/new-message-cuate.svg"
                                    alt={t('notificationsIllustrationAlt')}
                                    width={500}
                                    height={500}
                                    priority
                                    className="max-h-80 w-full object-contain"
                                />
                                <p className="absolute inset-x-0 bottom-3 text-center text-[0.6875rem] text-muted-foreground">
                                    <a
                                        href="https://storyset.com/illustration/new-message/cuate"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                                    >
                                        {t('notificationsIllustrationCredit')}
                                    </a>
                                </p>
                            </div>
                            <div className="flex flex-col justify-center px-7 py-10 sm:p-10">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                    {t('notificationsEmptyEyebrow')}
                                </p>
                                <h2 className="mt-3 text-balance text-2xl font-bold md:text-3xl">{t('noNotifications')}</h2>
                                <p className="mt-4 max-w-md font-light leading-relaxed text-muted-foreground">
                                    {t('noNotificationsDescription')}
                                </p>
                                <div className="mt-7">
                                    <Button render={<Link href="/search" />} nativeButton={false}>
                                        {t('startShopping')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="overflow-hidden">
                        <ol className="divide-y divide-border">
                            {orders.map(order => (
                                <li key={order.id}>
                                    <Link
                                        href={`/account/orders/${order.code}`}
                                        className="group flex min-h-24 items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"
                                    >
                                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <PackageCheck className="size-5" aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-medium">{t('orderUpdate', {code: order.code})}</span>
                                            <span className="mt-1 block text-sm font-light text-muted-foreground">
                                                {t('updatedOn', {date: formatDate(order.updatedAt, 'long', locale)})}
                                            </span>
                                        </span>
                                        <span className="hidden shrink-0 sm:block">
                                            <OrderStatusBadge state={order.state} />
                                        </span>
                                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    </Card>
                )}
            </div>
        </StorefrontPageShell>
    );
}
