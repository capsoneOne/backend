import type {
    VisualSearchErrorCode,
    VisualSearchResponse,
    VisualSearchState,
} from './types';

/**
 * Posts the raw image file to the storefront's route handler, which forwards it to
 * Vendure as multipart.
 *
 * The bytes are never base64-encoded, so there is no ~37% inflation and nothing has
 * to clear a server-action body limit. Errors come back as codes, never as upstream
 * exception text — the detail stays in the server log.
 */
export async function searchByImageUpload(
    file: File,
    locale: string,
    take = 12,
): Promise<VisualSearchState> {
    const form = new FormData();
    form.append('image', file);

    try {
        const res = await fetch(
            `/api/visual-search?take=${take}&languageCode=${encodeURIComponent(locale)}`,
            {method: 'POST', body: form},
        );
        const body: unknown = await res.json().catch(() => null);

        if (!res.ok) {
            const code = (body as {code?: VisualSearchErrorCode} | null)?.code;
            return {status: 'error', code: code ?? 'FAILED'};
        }
        return {status: 'ok', result: body as VisualSearchResponse};
    } catch {
        // Offline, or the storefront could not reach Vendure.
        return {status: 'error', code: 'UNAVAILABLE'};
    }
}

export async function searchSimilarProduct(
    productId: string,
    assetId: string | undefined,
    locale: string,
    take = 12,
): Promise<VisualSearchState> {
    try {
        const res = await fetch(
            `/api/visual-search?productId=${encodeURIComponent(productId)}${assetId ? `&assetId=${encodeURIComponent(assetId)}` : ''}&take=${take}&languageCode=${encodeURIComponent(locale)}`,
        );
        const body: unknown = await res.json().catch(() => null);
        if (!res.ok) {
            const code = (body as {code?: VisualSearchErrorCode} | null)?.code;
            return {status: 'error', code: code ?? 'FAILED'};
        }
        return {status: 'ok', result: body as VisualSearchResponse};
    } catch {
        return {status: 'error', code: 'UNAVAILABLE'};
    }
}
