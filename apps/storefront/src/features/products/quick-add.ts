'use server';

import {getLocale, getTranslations} from 'next-intl/server';
import {query} from '@/platform/vendure/api';
import {GetProductDetailQuery} from '@/features/products/graphql';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {addToCart} from '@/features/products/add-to-cart';

export type QuickAddResult =
    | {status: 'added'}
    | {status: 'needs-options'}
    | {status: 'out-of-stock'}
    | {status: 'error'; message: string};

/**
 * Add a product to the cart from a grid tile, by slug.
 *
 * The variant is resolved here rather than on the client because a `SearchResult`
 * cannot tell you how many variants a product has — `productVariantId` on a
 * grouped hit is just *one* of them. Quick-adding that blindly would drop a
 * size-M shirt into the basket for someone who clicked a tile showing all sizes.
 * So: look the product up, and only add when the choice is unambiguous.
 */
export async function quickAddToCart(slug: string): Promise<QuickAddResult> {
    const locale = await getLocale();
    const t = await getTranslations({locale, namespace: 'Errors'});

    try {
        const currencyCode = await getActiveCurrencyCode();
        const result = await query(GetProductDetailQuery, {slug}, {languageCode: locale, currencyCode});
        const variants = result.data.product?.variants ?? [];

        if (variants.length !== 1) return {status: 'needs-options'};

        const [variant] = variants;
        if (variant.stockLevel === 'OUT_OF_STOCK') return {status: 'out-of-stock'};

        const added = await addToCart(variant.id, 1);
        if (!added.success) {
            return {status: 'error', message: added.error ?? t('failedAddToCart')};
        }
        return {status: 'added'};
    } catch {
        return {status: 'error', message: t('failedAddToCart')};
    }
}
