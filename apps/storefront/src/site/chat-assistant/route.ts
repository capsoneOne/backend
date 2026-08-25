import {NextRequest, NextResponse} from 'next/server';

import {getAuthToken} from '@/platform/vendure/auth-token';

const SHOP_API_URL =
    process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL;
const CHANNEL_TOKEN =
    process.env.VENDURE_CHANNEL_TOKEN ||
    process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN ||
    '__default_channel__';
const CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';

const mutation = `
    mutation AskChatAssistant($message: String!, $history: [ChatAssistantHistoryInput!], $clientId: String) {
        askChatAssistant(message: $message, history: $history, clientId: $clientId) {
            answer
            products { productId name slug priceWithTax currencyCode inStock imageUrl }
            sources { label path kind }
        }
    }
`;

type ChatBody = {
    message?: unknown;
    locale?: unknown;
    history?: unknown;
    clientId?: unknown;
};

export async function POST(request: NextRequest) {
    if (!SHOP_API_URL) {
        console.error('[chat-assistant] VENDURE_SHOP_API_URL is not configured');
        return NextResponse.json({code: 'UNAVAILABLE'}, {status: 503});
    }

    let body: ChatBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({code: 'INVALID'}, {status: 400});
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 500) {
        return NextResponse.json({code: 'INVALID'}, {status: 400});
    }
    const clientId = typeof body.clientId === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(body.clientId)
        ? body.clientId
        : undefined;

    const history = Array.isArray(body.history)
        ? body.history
            .filter(item => item && typeof item === 'object')
            .map(item => item as {role?: unknown; content?: unknown})
            .filter(item =>
                (item.role === 'user' || item.role === 'assistant') &&
                typeof item.content === 'string',
            )
            .map(item => ({role: item.role, content: (item.content as string).slice(0, 500)}))
            .slice(-8)
        : [];

    const url = new URL(SHOP_API_URL);
    if (body.locale === 'en' || body.locale === 'km') {
        url.searchParams.set('languageCode', body.locale);
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        [CHANNEL_TOKEN_HEADER]: CHANNEL_TOKEN,
    };
    const token = await getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({query: mutation, variables: {message, history, clientId}}),
            signal: AbortSignal.timeout(30_000),
            cache: 'no-store',
        });
        const payload = await response.json() as {
            data?: {askChatAssistant?: unknown};
            errors?: Array<{
                message?: string;
                extensions?: {code?: string; retryAfterSeconds?: number};
            }>;
        };
        if (!response.ok || payload.errors?.length || !payload.data?.askChatAssistant) {
            console.error('[chat-assistant] upstream error', response.status, payload.errors);
            const extension = payload.errors?.[0]?.extensions;
            if (extension?.code && [
                'RATE_LIMITED',
                'DAILY_QUOTA_EXCEEDED',
                'SERVICE_BUSY',
                'UPSTREAM_RATE_LIMITED',
            ].includes(extension.code)) {
                const retryAfterSeconds = Math.max(1, Number(extension.retryAfterSeconds) || 30);
                return NextResponse.json(
                    {code: extension.code, retryAfterSeconds},
                    {status: 429, headers: {'Retry-After': String(retryAfterSeconds)}},
                );
            }
            return NextResponse.json({code: 'FAILED'}, {status: 502});
        }
        return NextResponse.json(payload.data.askChatAssistant);
    } catch (error) {
        console.error('[chat-assistant] request failed', error);
        return NextResponse.json({code: 'UNAVAILABLE'}, {status: 503});
    }
}
