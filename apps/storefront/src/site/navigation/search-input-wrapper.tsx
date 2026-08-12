import 'server-only';

import {getTopCollections} from '@/features/collections/data';
import {getRouteLocale} from '@/platform/i18n/server';
import {SearchInput} from '@/site/navigation/search-input';

export async function SearchInputWrapper() {
    const locale = await getRouteLocale();
    const categories = await getTopCollections(locale);

    return <SearchInput categories={categories} />;
}
