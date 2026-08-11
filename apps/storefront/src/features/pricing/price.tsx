'use client';

import {useLocale} from 'next-intl';
import {toIntlLocale} from '@/platform/i18n/locale-utils';

interface PriceProps {
    value: number;
    currencyCode?: string;
}

export function Price({value, currencyCode = 'USD'}: PriceProps) {
    const locale = useLocale();
    // Chromium and Node currently disagree about currency placement for km-KH
    // ("34.00$" versus "$34.00"), which causes hydration mismatches. Keep the
    // storefront's USD-style price notation deterministic while the surrounding
    // product content remains fully localized in Khmer.
    const intlLocale = locale === 'km' ? 'en-US' : toIntlLocale(locale);
    return (
        <>
            {new Intl.NumberFormat(intlLocale, {
                style: 'currency',
                currency: currencyCode,
            }).format(value / 100)}
        </>
    );
}
