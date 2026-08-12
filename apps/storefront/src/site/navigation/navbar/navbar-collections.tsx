import {cacheLife, cacheTag} from 'next/cache';
import {getTranslations} from 'next-intl/server';
import {getTopCollections} from '@/features/collections/data';
import {getRouteLocale} from '@/platform/i18n/server';
import {NavbarCollectionsMenu} from './navbar-collections-menu';

export async function NavbarCollections() {
    'use cache';
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`navbar-collections-${locale}`);

    const [collections, t] = await Promise.all([
        getTopCollections(locale),
        getTranslations({locale, namespace: 'Navigation'}),
    ]);

    return (
        <NavbarCollectionsMenu
            collections={collections}
            categoriesLabel={t('categories')}
            viewAllLabel={t('viewAllCategories')}
        />
    );
}
