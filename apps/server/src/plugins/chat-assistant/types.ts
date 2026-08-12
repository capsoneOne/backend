export interface ChatAssistantPluginOptions {
    apiKey?: string;
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
}

export interface ChatSource {
    label: string;
    path: string;
    kind: 'policy' | 'product' | 'cart' | 'order';
}
