import {CartItems} from "@/features/cart/routes/cart-items";
import {OrderSummary} from "@/features/cart/routes/order-summary";
import {PromotionCode} from "@/features/cart/routes/promotion-code";
import {getRouteLocale} from "@/platform/i18n/server";
import {getActiveCurrencyCode} from "@/features/currency/currency-server";
import {cacheLife, cacheTag} from "next/cache";
import {query} from "@/platform/vendure/api";
import {GetActiveOrderQuery} from '@/features/cart/graphql';

export async function Cart() {
    "use cache: private"
    cacheLife('minutes');
    cacheTag('cart');

    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const {data} = await query(GetActiveOrderQuery, {}, {
        useAuthToken: true,
        languageCode: locale,
        currencyCode,
    });

    const activeOrder = data.activeOrder;

    if (!activeOrder || activeOrder.lines.length === 0) {
        return <CartItems activeOrder={null}/>;
    }

    return (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
            <CartItems activeOrder={activeOrder}/>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                <OrderSummary activeOrder={activeOrder}/>
                <PromotionCode activeOrder={activeOrder}/>
            </aside>
        </div>
    )
}
