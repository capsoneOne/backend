import {NextRequest, NextResponse} from 'next/server';

import {getAuthToken} from '@/platform/vendure/auth-token';
import {VISUAL_SEARCH_MAX_FILE_BYTES} from '@/features/visual-search/limits';

/**
 * Binary upload proxy for visual search.
 *
 * Why a route handler and not the server action:
 *
 *   * Server actions cap the request body (`experimental.serverActions.bodySizeLimit`)
 *     and reject oversized ones *before* the action runs, so the action's own error
 *     handling never sees it and Next's raw message reaches the user. A route handler
 *     streams the body and has no such cap.
 *   * The action had to receive base64, because a server action argument is JSON.
 *     Here the bytes stay binary end to end — about 25% less to upload.
 *
 * Why proxy at all, rather than posting straight to Vendure: VENDURE_SHOP_API_URL and
 * the channel token are server-only, and posting from the browser would publish both.
 * This keeps the same posture the server action had.
 */

const SHOP_API_URL =
    process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL;
const CHANNEL_TOKEN =
    process.env.VENDURE_CHANNEL_TOKEN ||
    process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN ||
    '__default_channel__';
const CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';

/** `/shop-api` -> `/visual-search/search` on the same origin. */
function restEndpoint(): string {
    if (!SHOP_API_URL) {
        throw new Error('VENDURE_SHOP_API_URL is not set');
    }
    const url = new URL(SHOP_API_URL);
    url.pathname = '/visual-search/search';
    return url.toString();
}

export async function POST(request: NextRequest) {
    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({code: 'FAILED'}, {status: 400});
    }

    const image = form.get('image');
    if (!(image instanceof File) || image.size === 0) {
        return NextResponse.json({code: 'EMPTY'}, {status: 400});
    }
    if (!image.type.startsWith('image/')) {
        return NextResponse.json({code: 'NOT_IMAGE'}, {status: 400});
    }
    if (image.size > VISUAL_SEARCH_MAX_FILE_BYTES) {
        // The browser checks this too; repeated because a route handler is public.
        return NextResponse.json({code: 'TOO_LARGE'}, {status: 413});
    }

    const take = request.nextUrl.searchParams.get('take') ?? '12';
    const languageCode = request.nextUrl.searchParams.get('languageCode') ?? 'en';

    const upstream = new FormData();
    upstream.append('image', image, image.name || 'query');

    const headers: Record<string, string> = {[CHANNEL_TOKEN_HEADER]: CHANNEL_TOKEN};
    const authToken = await getAuthToken();
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const res = await fetch(
            `${restEndpoint()}?take=${encodeURIComponent(take)}&languageCode=${encodeURIComponent(languageCode)}`,
            {method: 'POST', body: upstream, headers},
        );

        if (!res.ok) {
            console.error('[visual-search] upstream returned', res.status, await res.text());
            return NextResponse.json({code: 'FAILED'}, {status: 502});
        }
        return NextResponse.json(await res.json());
    } catch (e) {
        // A dead embedder or server must degrade, not crash the page. Detail stays in
        // the server log; the browser gets a code it can translate.
        console.error('[visual-search] upload failed', e);
        return NextResponse.json({code: 'UNAVAILABLE'}, {status: 503});
    }
}

export async function GET(request: NextRequest) {
    const productId = request.nextUrl.searchParams.get('productId');
    const assetId = request.nextUrl.searchParams.get('assetId');
    if (!productId) {
        return NextResponse.json({code: 'EMPTY'}, {status: 400});
    }

    const take = request.nextUrl.searchParams.get('take') ?? '12';
    const languageCode = request.nextUrl.searchParams.get('languageCode') ?? 'en';
    const headers: Record<string, string> = {[CHANNEL_TOKEN_HEADER]: CHANNEL_TOKEN};
    const authToken = await getAuthToken();
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    try {
        const endpoint = new URL(restEndpoint());
        endpoint.pathname = '/visual-search/similar';
        endpoint.searchParams.set('productId', productId);
        if (assetId) endpoint.searchParams.set('assetId', assetId);
        endpoint.searchParams.set('take', take);
        endpoint.searchParams.set('languageCode', languageCode);
        const res = await fetch(endpoint, {headers});
        if (!res.ok) {
            console.error('[visual-search] similar upstream returned', res.status, await res.text());
            return NextResponse.json({code: 'FAILED'}, {status: 502});
        }
        return NextResponse.json(await res.json());
    } catch (e) {
        console.error('[visual-search] similar search failed', e);
        return NextResponse.json({code: 'UNAVAILABLE'}, {status: 503});
    }
}
