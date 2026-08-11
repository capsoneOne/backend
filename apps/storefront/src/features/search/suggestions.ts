'use server';

import {getLocale} from 'next-intl/server';
import {query} from '@/platform/vendure/api';
import {SearchSuggestionsQuery} from '@/features/search/graphql';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';

export interface SearchSuggestion {
    productId: string;
    productName: string;
    slug: string;
    imageUrl: string | null;
    price: number;
    currencyCode: string;
}

export interface SuggestionResult {
    items: SearchSuggestion[];
    totalItems: number;
}

const MAX_SUGGESTIONS = 6;

/**
 * Typeahead results for the header search box.
 *
 * Deliberately a server action rather than a public route handler: it runs with
 * the storefront's channel token and cannot be scraped as an open endpoint.
 */
export async function fetchSearchSuggestions(term: string): Promise<SuggestionResult> {
    const trimmed = term.trim();
    if (trimmed.length < 2) return {items: [], totalItems: 0};

    try {
        const locale = await getLocale();
        const currencyCode = await getActiveCurrencyCode();
        const result = await query(
            SearchSuggestionsQuery,
            {input: {term: trimmed, take: MAX_SUGGESTIONS, groupByProduct: true}},
            {languageCode: locale, currencyCode},
        );

        return {
            totalItems: result.data.search.totalItems,
            items: result.data.search.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                slug: item.slug,
                imageUrl: item.productAsset?.preview ?? null,
                price:
                    item.priceWithTax.__typename === 'PriceRange'
                        ? item.priceWithTax.min
                        : item.priceWithTax.__typename === 'SinglePrice'
                          ? item.priceWithTax.value
                          : 0,
                currencyCode: item.currencyCode,
            })),
        };
    } catch {
        // A failed suggestion lookup must never block typing or submitting.
        return {items: [], totalItems: 0};
    }
}
