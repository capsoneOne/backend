'use server';

import {query} from '@/platform/vendure/api';
import {getRouteLocale} from '@/platform/i18n/server';
import {SearchByImageQuery} from './graphql';
import type {ResultOf} from '@/platform/vendure/graphql';

export type VisualSearchState =
    | {status: 'idle'}
    | {status: 'error'; message: string}
    | {status: 'ok'; result: ResultOf<typeof SearchByImageQuery>['searchByImage']};

/**
 * Server action rather than a client fetch: the Vendure client reads the channel
 * token and auth cookie server-side, and keeps VENDURE_SHOP_API_URL off the browser.
 */
export async function searchByImageAction(imageBase64: string): Promise<VisualSearchState> {
    if (!imageBase64) {
        return {status: 'error', message: 'empty'};
    }
    try {
        const locale = await getRouteLocale();
        const {data} = await query(
            SearchByImageQuery,
            {image: imageBase64, take: 12},
            {languageCode: locale},
        );
        return {status: 'ok', result: data.searchByImage};
    } catch (e) {
        // The embedder being down must degrade, not crash the page.
        const message = e instanceof Error ? e.message : 'unknown error';
        return {status: 'error', message};
    }
}
