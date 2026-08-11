import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetAllCollectionsQuery, GetTopCollectionsQuery} from './graphql';

export async function getTopCollections(locale: string) {
    'use cache';
    cacheLife('days');
    cacheTag(`collections-${locale}`);

    const result = await query(GetTopCollectionsQuery, undefined, {languageCode: locale});
    return result.data.collections.items;
}

export async function getAllCollections(locale: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`collections-all-${locale}`);
    cacheTag('collection');

    const result = await query(GetAllCollectionsQuery, undefined, {languageCode: locale});
    return result.data.collections.items;
}
