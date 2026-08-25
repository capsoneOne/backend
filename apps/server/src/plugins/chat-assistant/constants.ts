export const CHAT_ASSISTANT_OPTIONS = Symbol('CHAT_ASSISTANT_OPTIONS');
export const loggerCtx = 'ChatAssistantPlugin';


/**
 * Groq's hosted gpt-oss-20b. Chosen on Khmer output, not size: the 120b variant
 * intermittently answered Khmer questions in Thai script, which a Khmer speaker
 * spots instantly, and Qwen leaked its reasoning block. The smaller model was clean
 * across both test questions.
 */
export const DEFAULT_MODEL = 'openai/gpt-oss-20b';

/** Groq's OpenAI-compatible endpoint. */
export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Words that ask for an ordering rather than name a thing to find. They have to be
 * pulled out of the search terms — "cheapest" appears in no product description, so
 * left in it matches nothing and drags the whole query down with it.
 */
export const PRICE_ASC_WORDS = new Set([
    'cheapest', 'cheap', 'lowest', 'affordable', 'budget', 'inexpensive',
    'ថោក', 'ថោកបំផុត',
]);

export const PRICE_DESC_WORDS = new Set([
    'expensive', 'priciest', 'dearest', 'premium', 'luxury', 'highest',
    'ថ្លៃ', 'ថ្លៃបំផុត',
]);

/**
 * Words that stand in for "a thing you sell" without naming one. They cannot be
 * matched — no product description contains the word "product" — but their presence
 * is a browse request, which deserves a sample of the catalogue rather than the
 * "I have no product information" that an empty match produces.
 */
export const GENERIC_ITEM_WORDS = new Set([
    'product', 'products', 'item', 'items', 'something', 'anything', 'stuff',
    'thing', 'things', 'catalogue', 'catalog',
    'ទំនិញ', 'ផលិតផល', 'អ្វី',
]);
