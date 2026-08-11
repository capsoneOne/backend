'use client';

import {useEffect, useState} from 'react';
import {Monitor, Moon, Sun} from 'lucide-react';
import {useTheme} from 'next-themes';
import {useTranslations} from 'next-intl';
import {Label} from '@/components/ui/label';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';

const options = [
    {value: 'light', labelKey: 'themeLight', descriptionKey: 'themeLightDescription', icon: Sun},
    {value: 'dark', labelKey: 'themeDark', descriptionKey: 'themeDarkDescription', icon: Moon},
    {value: 'system', labelKey: 'themeSystem', descriptionKey: 'themeSystemDescription', icon: Monitor},
] as const;

export function AppearanceSettings() {
    const [mounted, setMounted] = useState(false);
    const {theme, setTheme} = useTheme();
    const t = useTranslations('Account');

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return (
            <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
                {options.map(option => <Skeleton key={option.value} className="h-24 rounded-xl" />)}
            </div>
        );
    }

    return (
        <RadioGroup
            value={theme ?? 'system'}
            onValueChange={setTheme}
            className="grid gap-3 sm:grid-cols-3"
            aria-label={t('appearance')}
        >
            {options.map(option => {
                const Icon = option.icon;
                const selected = theme === option.value;

                return (
                    <Label
                        key={option.value}
                        htmlFor={`theme-${option.value}`}
                        className={cn(
                            'flex min-h-24 cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/60',
                            selected && 'border-primary bg-primary/5 ring-1 ring-primary',
                        )}
                    >
                        <RadioGroupItem id={`theme-${option.value}`} value={option.value} className="mt-0.5" />
                        <span className="min-w-0 space-y-1">
                            <span className="flex items-center gap-2 font-medium">
                                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                                {t(option.labelKey)}
                            </span>
                            <span className="block text-sm font-normal leading-relaxed text-muted-foreground">
                                {t(option.descriptionKey)}
                            </span>
                        </span>
                    </Label>
                );
            })}
        </RadioGroup>
    );
}
