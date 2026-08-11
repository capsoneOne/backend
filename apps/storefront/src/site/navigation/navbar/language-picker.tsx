'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useRouter, usePathname} from '@/platform/i18n/navigation';
import {routing, localeNames} from '@/platform/i18n/routing';
import {Globe} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguagePicker() {
    const locale = useLocale();
    const t = useTranslations('Navigation');
    const router = useRouter();
    const pathname = usePathname();

    const handleLocaleChange = (newLocale: string) => {
        router.replace(pathname, {locale: newLocale});
    };

    // Nothing to switch between with a single configured locale, so render nothing —
    // same rule CurrencyPicker applies to a single-currency channel. Add a locale to
    // routing.ts and the control reappears on its own.
    if (routing.locales.length <= 1) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-1.5" aria-label={t('switchLanguage')} />}>
                <Globe className="size-4" />
                {/* Label is icon-only below sm: "English" and especially "ភាសាខ្មែរ" are wide
                    enough to overflow the 430px navbar and clip the sign-in button. */}
                <span className="hidden sm:inline">{localeNames[locale as keyof typeof localeNames] ?? locale.toUpperCase()}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {routing.locales.map((loc) => (
                    <DropdownMenuItem
                        key={loc}
                        onClick={() => handleLocaleChange(loc)}
                    >
                        <span>{localeNames[loc] ?? loc.toUpperCase()}</span>
                        {locale === loc && <span className="ml-auto text-xs">✓</span>}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
