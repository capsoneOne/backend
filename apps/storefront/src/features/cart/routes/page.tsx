import type {Metadata} from 'next';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {Cart} from "@/features/cart/routes/cart";
import {Suspense} from "react";
import {CartSkeleton} from "@/features/cart/components/cart-skeleton";
import {noIndexRobots} from '@/config/metadata';
import {StorefrontPageHeader, StorefrontPageShell} from '@/components/catalogue-page';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Cart'});
    return {
        title: t('title'),
        robots: noIndexRobots(),
    };
}

export default async function CartPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Cart'});

    return (
        <StorefrontPageShell>
            <div className="mx-auto max-w-6xl">
                <StorefrontPageHeader
                    eyebrow={t('eyebrow')}
                    title={t('title')}
                    description={t('description')}
                />

                <Suspense fallback={<CartSkeleton />}>
                    <Cart/>
                </Suspense>
            </div>
        </StorefrontPageShell>
    );
}
