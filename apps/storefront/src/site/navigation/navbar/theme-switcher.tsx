"use client";

import {useTheme} from "next-themes";
import {useEffect, useState} from "react";
import {Moon, Sun} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useTranslations} from 'next-intl';
import {cn} from '@/lib/utils';
import {navbarIconClass} from '@/site/navigation/navigation-styles';

export function ThemeSwitcher({className}: {className?: string}) {
    const t = useTranslations('Navigation');
    const [mounted, setMounted] = useState(false);
    const {resolvedTheme, setTheme} = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className={cn(navbarIconClass, 'theme-toggle', className)} disabled>
                <Sun className="theme-toggle-sun size-5" />
                <span className="sr-only">{t('toggleTheme')}</span>
            </Button>
        );
    }

    const dark = resolvedTheme === 'dark';

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(navbarIconClass, 'theme-toggle', className)}
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            aria-label={t('toggleTheme')}
            aria-pressed={dark}
            title={t('toggleTheme')}
        >
            <Sun className="theme-toggle-sun size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="theme-toggle-moon absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t('toggleTheme')}</span>
        </Button>
    );
}
