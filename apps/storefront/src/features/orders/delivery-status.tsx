import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Package, PackageCheck, Truck, XCircle, type LucideIcon} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';

import {formatDate} from '@/platform/i18n/format';

/**
 * Shipment progress for an order.
 *
 * Vendure records fulfilments the moment an operator ships from the dashboard, but
 * nothing surfaced them, so a customer's view of their order stopped at "paid".
 * This is the rest of that story.
 *
 * Deliberately not async: the order-confirmation page is a Server Component while
 * the account order detail is a Client one, and only the hook form of next-intl
 * renders in both.
 */

export interface OrderFulfillment {
    id: string;
    state: string;
    method: string;
    trackingCode?: string | null;
    createdAt: string;
}

type FulfillmentStateKey = 'states.Pending' | 'states.Shipped' | 'states.Delivered' | 'states.Cancelled';

/** Vendure's built-in fulfilment states. Anything unrecognised falls back to neutral. */
const STATE_CONFIG: Record<string, {color: string; icon: LucideIcon}> = {
    Pending: {color: 'bg-yellow-100 text-yellow-800', icon: Package},
    Shipped: {color: 'bg-purple-100 text-purple-800', icon: Truck},
    Delivered: {color: 'bg-emerald-100 text-emerald-800', icon: PackageCheck},
    Cancelled: {color: 'bg-red-100 text-red-800', icon: XCircle},
};

export function DeliveryStatus({
    fulfillments,
    className,
}: {
    fulfillments?: OrderFulfillment[] | null;
    className?: string;
}) {
    const t = useTranslations('Delivery');
    const locale = useLocale();

    const shipments = fulfillments ?? [];

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
            </CardHeader>
            <CardContent>
                {shipments.length === 0 ? (
                    // Saying nothing here reads as a missing feature; saying "not yet"
                    // tells the customer the order is fine and simply has not moved.
                    <p className="text-sm font-light leading-relaxed text-muted-foreground">
                        {t('notShippedYet')}
                    </p>
                ) : (
                    <ul className="space-y-4">
                        {shipments.map((shipment, index) => {
                            const config = STATE_CONFIG[shipment.state] ?? {
                                color: 'bg-gray-100 text-gray-800',
                                icon: Package,
                            };
                            const Icon = config.icon;
                            const label =
                                shipment.state in STATE_CONFIG
                                    ? t(`states.${shipment.state}` as FulfillmentStateKey)
                                    : shipment.state;

                            return (
                                <li
                                    key={shipment.id}
                                    className="border-b border-border pb-4 last:border-b-0 last:pb-0"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="flex items-center gap-2">
                                            {/* Numbered only when there is more than one, so a
                                                single shipment is not labelled "Shipment 1". */}
                                            {shipments.length > 1 && (
                                                <span className="text-sm font-medium">
                                                    {t('shipmentNumber', {number: index + 1})}
                                                </span>
                                            )}
                                            <Badge className={config.color} variant="secondary">
                                                <Icon className="mr-1 size-3" aria-hidden="true" />
                                                {label}
                                            </Badge>
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {formatDate(shipment.createdAt, 'short', locale)}
                                        </span>
                                    </div>

                                    <dl className="mt-3 space-y-1 text-sm">
                                        <div className="flex gap-2">
                                            <dt className="text-muted-foreground">{t('method')}</dt>
                                            <dd className="font-medium">{shipment.method}</dd>
                                        </div>
                                        {shipment.trackingCode && (
                                            <div className="flex flex-wrap gap-2">
                                                <dt className="text-muted-foreground">{t('trackingCode')}</dt>
                                                {/* Plain text, not a link: there is no carrier
                                                    integration, and a guessed tracking URL that
                                                    404s is worse than a code to paste. */}
                                                <dd className="font-mono font-medium break-all select-all">
                                                    {shipment.trackingCode}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
