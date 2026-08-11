'use client';

import {useTranslations} from 'next-intl';
import {Coins} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {useRouter} from '@/platform/i18n/navigation';
import {switchCurrency} from '@/features/currency/switch-currency';
import {useTransition} from 'react';
import {navbarInteractiveClass} from '@/site/navigation/navigation-styles';

interface CurrencyPickerProps {
    availableCurrencyCodes: string[];
    activeCurrencyCode: string;
}

export function CurrencyPicker({availableCurrencyCodes, activeCurrencyCode}: CurrencyPickerProps) {
    const t = useTranslations('Navigation');
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleCurrencyChange = (currencyCode: string) => {
        startTransition(async () => {
            await switchCurrency(currencyCode);
            router.refresh();
        });
    };

    if (availableCurrencyCodes.length <= 1) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className={`${navbarInteractiveClass} rounded-lg px-3 text-muted-foreground`} aria-label={t('switchCurrency')} />}>
                <Coins className="size-4" />
                <span className="hidden sm:inline">{activeCurrencyCode}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {availableCurrencyCodes.map((code) => (
                    <DropdownMenuItem
                        key={code}
                        onClick={() => handleCurrencyChange(code)}
                        disabled={isPending}
                    >
                        <span>{code}</span>
                        {activeCurrencyCode === code && <span className="ml-auto text-xs">✓</span>}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
