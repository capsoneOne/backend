import { Link } from '@/platform/i18n/navigation';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Lock} from 'lucide-react';
import {Price} from '@/features/pricing/price';
import {getTranslations} from 'next-intl/server';

type ActiveOrder = {
    id: string;
    currencyCode: string;
    subTotalWithTax: number;
    shippingWithTax: number;
    totalWithTax: number;
    discounts?: Array<{
        description: string;
        amountWithTax: number;
    }> | null;
};

export async function OrderSummary({activeOrder}: { activeOrder: ActiveOrder }) {
    const t = await getTranslations('Cart');
    return (
        <Card className="gap-5 border-border">
            <CardHeader>
                <CardTitle className="text-xl font-bold">{t('orderSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('subtotal')}</span>
                        <span>
                            <Price value={activeOrder.subTotalWithTax} currencyCode={activeOrder.currencyCode}/>
                        </span>
                    </div>
                    {activeOrder.discounts && activeOrder.discounts.length > 0 && (
                        <>
                            {activeOrder.discounts.map((discount, index) => (
                                <div key={index} className="flex justify-between text-sm text-green-600">
                                    <span>{discount.description}</span>
                                    <span>
                                        <Price value={discount.amountWithTax} currencyCode={activeOrder.currencyCode}/>
                                    </span>
                                </div>
                            ))}
                        </>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('shipping')}</span>
                        <span>
                            {activeOrder.shippingWithTax > 0
                                ? <Price value={activeOrder.shippingWithTax} currencyCode={activeOrder.currencyCode}/>
                                : t('calculatedAtCheckout')}
                        </span>
                    </div>
                </div>

                <div className="mb-6 border-t border-border pt-4">
                    <div className="flex items-baseline justify-between text-lg font-bold">
                        <span>{t('total')}</span>
                        <span className="text-2xl">
                            <Price value={activeOrder.totalWithTax} currencyCode={activeOrder.currencyCode}/>
                        </span>
                    </div>
                </div>

                <Button render={<Link href="/checkout" />} nativeButton={false} className="min-h-11 w-full px-5" size="lg">{t('proceedToCheckout')}</Button>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span>{t('secureCheckout')}</span>
                </div>

                <Button render={<Link href="/search" />} nativeButton={false} variant="outline" className="mt-3 min-h-11 w-full px-5">{t('continueShopping')}</Button>
            </CardContent>
        </Card>
    );
}
