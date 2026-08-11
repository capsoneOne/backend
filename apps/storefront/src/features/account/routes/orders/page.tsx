import type {Metadata} from 'next';
import {query} from '@/platform/vendure/api';
import {GetCustomerOrdersQuery} from '@/features/account/graphql';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {ArrowRightIcon, PackageOpen} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Price} from '@/features/pricing/price';
import {OrderStatusBadge} from '@/features/orders/order-status-badge';
import {formatDate} from '@/platform/i18n/format';
import { Link, redirect } from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {AccountEmptyState} from '@/features/account/components/account-empty-state';
import {AccountPageHeader} from '@/features/account/components/account-page-header';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});
    return {
        title: t('ordersPageTitle'),
    };
}

const ITEMS_PER_PAGE = 10;

export default async function OrdersPage(props: PageProps<'/[locale]/account/orders'>) {
    const searchParams = await props.searchParams;
    const locale = await getRouteLocale();
    const pageParam = searchParams.page;
    const currentPage = parseInt(Array.isArray(pageParam) ? pageParam[0] : pageParam || '1', 10);
    const skip = (currentPage - 1) * ITEMS_PER_PAGE;

    const {data} = await query(
        GetCustomerOrdersQuery,
        {
            options: {
                take: ITEMS_PER_PAGE,
                skip,
                filter: {
                    state: {
                        notEq: 'AddingItems',
                    },
                },
            },
        },
        {useAuthToken: true}
    );

    if (!data.activeCustomer) {
        return redirect({href: '/sign-in', locale});
    }
    const t = await getTranslations({locale, namespace: 'Account'});

    const orders = data.activeCustomer.orders.items;
    const totalItems = data.activeCustomer.orders.totalItems;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return (
        <div>
            <AccountPageHeader title={t('myOrders')} description={t('ordersDescription')} />

            {orders.length === 0 ? (
                <AccountEmptyState
                    icon={PackageOpen}
                    title={t('noOrders')}
                    description={t('noOrdersDescription')}
                    action={(
                        <Button render={<Link href="/search" />} nativeButton={false} className="min-h-11 px-5">
                            {t('startShopping')}
                        </Button>
                    )}
                />
            ) : (
                <>
                    {/* Mobile: Card-based layout */}
                    <div className="space-y-3 md:hidden">
                        {orders.map((order) => (
                            <Link
                                key={order.id}
                                href={`/account/orders/${order.code}`}
                                className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="font-medium">#{order.code}</span>
                                    <OrderStatusBadge state={order.state}/>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{formatDate(order.createdAt, 'short', locale)}</span>
                                    <span className="font-medium text-base">
                                        <Price value={order.totalWithTax} currencyCode={order.currencyCode}/>
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        {order.lines.length} {order.lines.length === 1 ? t('item') : t('items')}
                                    </span>
                                    <ArrowRightIcon className="h-4 w-4 text-muted-foreground"/>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                        <Table>
                            <TableHeader className="bg-muted/60">
                                <TableRow>
                                    <TableHead>{t('orderNumber')}</TableHead>
                                    <TableHead>{t('date')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('itemsHeader')}</TableHead>
                                    <TableHead className="text-right">{t('totalHeader')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <Link
                                                href={`/account/orders/${order.code}`}
                                                className="inline-flex min-h-10 items-center gap-2 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                #{order.code} <ArrowRightIcon className="size-4" aria-hidden="true" />
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(order.createdAt, 'short', locale)}
                                        </TableCell>
                                        <TableCell>
                                            <OrderStatusBadge state={order.state}/>
                                        </TableCell>
                                        <TableCell>
                                            {order.lines.length}{' '}
                                            {order.lines.length === 1 ? t('item') : t('items')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Price value={order.totalWithTax} currencyCode={order.currencyCode}/>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-6">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={
                                                currentPage > 1
                                                    ? `/account/orders?page=${currentPage - 1}`
                                                    : '#'
                                            }
                                            className={
                                                currentPage === 1
                                                    ? 'pointer-events-none opacity-50'
                                                    : ''
                                            }
                                        />
                                    </PaginationItem>

                                    {Array.from({length: totalPages}, (_, i) => i + 1).map(
                                        (page) => {
                                            if (
                                                page === 1 ||
                                                page === totalPages ||
                                                (page >= currentPage - 1 &&
                                                    page <= currentPage + 1)
                                            ) {
                                                return (
                                                    <PaginationItem key={page}>
                                                        <PaginationLink
                                                            href={`/account/orders?page=${page}`}
                                                            isActive={page === currentPage}
                                                        >
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                );
                                            } else if (
                                                page === currentPage - 2 ||
                                                page === currentPage + 2
                                            ) {
                                                return (
                                                    <PaginationItem key={page}>
                                                        <PaginationEllipsis/>
                                                    </PaginationItem>
                                                );
                                            }
                                            return null;
                                        }
                                    )}

                                    <PaginationItem>
                                        <PaginationNext
                                            href={
                                                currentPage < totalPages
                                                    ? `/account/orders?page=${currentPage + 1}`
                                                    : '#'
                                            }
                                            className={
                                                currentPage === totalPages
                                                    ? 'pointer-events-none opacity-50'
                                                    : ''
                                            }
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
