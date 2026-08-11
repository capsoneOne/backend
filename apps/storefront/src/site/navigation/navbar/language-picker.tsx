'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useRouter, usePathname} from '@/platform/i18n/navigation';
import {useSearchParams} from 'next/navigation';
import {Languages} from 'lucide-react';
import {Button} from '@/components/ui/button';

export function LanguagePicker() {
    const locale = useLocale();
    const t = useTranslations('Navigation');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const nextLocale = locale === 'en' ? 'km' : 'en';
    const label = nextLocale === 'km' ? t('switchToKhmer') : t('switchToEnglish');

    const toggleLocale = () => {
        const query = searchParams.toString();
        router.replace(`${pathname}${query ? `?${query}` : ''}`, {locale: nextLocale});
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative size-11 text-muted-foreground hover:text-foreground"
            onClick={toggleLocale}
            aria-label={label}
            title={label}
        >
            <Languages className="size-5" aria-hidden="true" />
            <span className="absolute bottom-0.5 right-0.5 rounded bg-primary px-1 text-[0.55rem] font-bold leading-3 text-primary-foreground" aria-hidden="true">
                {nextLocale === 'km' ? 'ខ្មែរ' : 'EN'}
            </span>
        </Button>
    );
}
