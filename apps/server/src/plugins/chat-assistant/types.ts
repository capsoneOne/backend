export interface ChatAssistantPluginOptions {
    /**
     * Asset URL prefix, mirroring what AssetServerPlugin is configured with. Passed
     * in rather than read from config because it is a plugin option, not a core one,
     * and duplicating the bucket logic here would give it two homes.
     */
    assetUrlPrefix?: string;
    apiKey?: string;
    /**
     * OpenAI-compatible endpoint. Set it to point at Groq, Gemini or a local
     * runtime; left unset the SDK talks to OpenAI. The call below uses Chat
     * Completions rather than the Responses API precisely so this is swappable —
     * Responses is OpenAI-only, Chat Completions is what everyone else implements.
     */
    baseUrl?: string;
    model?: string;
    maxHistoryMessages?: number;
    maxOutputTokens?: number;
    anonymousRequestsPerMinute?: number;
    anonymousRequestsPerDay?: number;
    authenticatedRequestsPerMinute?: number;
    authenticatedRequestsPerDay?: number;
    globalRequestsPerDay?: number;
    globalInputTokensPerDay?: number;
    globalOutputTokensPerDay?: number;
    maxConcurrentRequests?: number;
    leaseTtlSeconds?: number;
}

export interface ChatHistoryMessage {
    role: 'assistant' | 'user';
    content: string;
}

export interface ChatProductReference {
    productId: string;
    name: string;
    slug: string;
    description: string;
    priceWithTax: number;
    currencyCode: string;
    inStock: boolean;
    /** Absolute URL of the product's preview image, or null when it has none. */
    imageUrl: string | null;
}

export interface ChatSource {
    label: string;
    path: string;
    kind: 'policy' | 'product' | 'cart' | 'order';
}
