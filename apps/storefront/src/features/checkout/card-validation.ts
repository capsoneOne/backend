/**
 * Card validation for the demo checkout.
 *
 * These are the checks a real gateway's client library runs before it will even
 * tokenise a card: they catch a mistyped number without a network round trip. The
 * arithmetic is genuine — only the authorisation at the end is simulated.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'unionpay' | 'unknown';

export type CardOutcome = 'approved' | 'declined';

/**
 * Documented test numbers for the offline demo handler, kept recognisable so anyone who knows
 * those will reach for the right card here. Every other Luhn-valid number approves,
 * which keeps the demo forgiving without hiding the declined path.
 */
export const TEST_CARDS = {
    approved: '4242424242424242',
    declined: '4000000000000002',
} as const;

const BRAND_PATTERNS: Array<{brand: CardBrand; pattern: RegExp; lengths: number[]; cvc: number}> = [
    {brand: 'visa', pattern: /^4/, lengths: [13, 16, 19], cvc: 3},
    {brand: 'mastercard', pattern: /^(5[1-5]|2[2-7])/, lengths: [16], cvc: 3},
    {brand: 'amex', pattern: /^3[47]/, lengths: [15], cvc: 4},
    // UnionPay matters here: it is the card most widely issued in Cambodia.
    {brand: 'unionpay', pattern: /^62/, lengths: [16, 17, 18, 19], cvc: 3},
];

export function stripNonDigits(value: string): string {
    return value.replace(/\D/g, '');
}

/** Groups digits for display. Amex reads 4-6-5; everything else reads in fours. */
export function formatCardNumber(value: string): string {
    const digits = stripNonDigits(value).slice(0, 19);
    if (detectBrand(digits) === 'amex') {
        return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
            .filter(Boolean)
            .join(' ');
    }
    return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function detectBrand(digits: string): CardBrand {
    return BRAND_PATTERNS.find(entry => entry.pattern.test(digits))?.brand ?? 'unknown';
}

export function cvcLengthFor(brand: CardBrand): number {
    return BRAND_PATTERNS.find(entry => entry.brand === brand)?.cvc ?? 3;
}

export function hasValidLength(digits: string): boolean {
    const brand = detectBrand(digits);
    const entry = BRAND_PATTERNS.find(item => item.brand === brand);
    // An unrecognised prefix still gets a sane range rather than a hard reject: the
    // Luhn check below is the real gate.
    return entry ? entry.lengths.includes(digits.length) : digits.length >= 12 && digits.length <= 19;
}

/**
 * The Luhn checksum every issuer's numbering scheme satisfies. Doubling every second
 * digit from the right and summing must land on a multiple of ten, which catches
 * single-digit typos and most transpositions.
 */
export function isLuhnValid(digits: string): boolean {
    if (!/^\d+$/.test(digits)) return false;

    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let value = digits.charCodeAt(i) - 48;
        if (double) {
            value *= 2;
            if (value > 9) value -= 9;
        }
        sum += value;
        double = !double;
    }
    return sum % 10 === 0;
}

/**
 * A card is good through the last day of its expiry month, so the comparison is
 * against the first day of the following month rather than today's date.
 */
export function isExpiryValid(month: string, year: string, now: Date = new Date()): boolean {
    const mm = Number(month);
    const yy = Number(year);
    if (!Number.isInteger(mm) || !Number.isInteger(yy) || mm < 1 || mm > 12) return false;

    const fullYear = year.length === 2 ? 2000 + yy : yy;
    if (fullYear < 2000 || fullYear > 2100) return false;

    const expiresAfter = new Date(Date.UTC(fullYear, mm, 1));
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return expiresAfter > today;
}

export function isCvcValid(cvc: string, brand: CardBrand): boolean {
    return new RegExp(`^\\d{${cvcLengthFor(brand)}}$`).test(cvc);
}

export function simulateOutcome(digits: string): CardOutcome {
    return digits === TEST_CARDS.declined ? 'declined' : 'approved';
}

export function lastFour(digits: string): string {
    return digits.slice(-4);
}
