import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {noIndexRobots} from '@/config/metadata';
import {WishlistList} from '@/features/wishlist/components/wishlist-list';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Wishlist'});
    return {
        title: t('title'),
        // The list lives on the device, so this page has no stable public content.
        robots: noIndexRobots(),
    };
}

export default function WishlistPage() {
    return <WishlistList />;
}
