import type {Metadata} from 'next';
import {Suspense} from 'react';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {OrderConfirmation} from './order-confirmation';
import {noIndexRobots} from '@/config/metadata';
import {StorefrontPageShell} from '@/components/catalogue-page';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'OrderConfirmation'});
    return {
        title: t('pageTitle'),
        robots: noIndexRobots(),
    };
}

export default async function OrderConfirmationPage(
    props: PageProps<'/[locale]/order-confirmation/[code]'>
) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Common'});

    return (
        <Suspense fallback={<StorefrontPageShell className="text-center">{t('loading')}</StorefrontPageShell>}>
            <OrderConfirmation paramsPromise={props.params} />
        </Suspense>
    );
}
