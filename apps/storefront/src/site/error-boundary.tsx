'use client';

import {useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {AlertTriangle, Home, RotateCcw} from 'lucide-react';
import {useTranslations} from 'next-intl';

/**
 * The segment-level error boundary.
 *
 * Without this, any throw inside a route segment — most commonly the Vendure API
 * being unreachable — renders Next.js's bare "A server error occurred" screen,
 * with no header, no footer and no way back into the store. Copy is hardcoded
 * The segment still sits inside the locale provider, so its recovery copy can
 * follow the shopper's selected language.
 */
export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & {digest?: string};
    reset: () => void;
}) {
    const t = useTranslations('ErrorPage');

    useEffect(() => {
        // Server digests are the only handle on the original stack in production.
        console.error('Route error', error.digest ?? '', error);
    }, [error]);

    return (
        <div className="container mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
            <div className="flex size-16 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <AlertTriangle className="size-7" />
            </div>

            <h1 className="mt-8 text-3xl font-bold">{t('title')}</h1>
            <p className="mt-3 font-light leading-relaxed text-muted-foreground">
                {t('message')}
            </p>

            {error.digest ? (
                <p className="mt-6 font-mono text-xs text-muted-foreground/70">
                    {t('reference', {digest: error.digest})}
                </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={reset} size="lg" className="rounded-full px-7">
                    <RotateCcw className="mr-2 size-4" />
                    {t('tryAgain')}
                </Button>
                <Button
                    render={<a href="/" />}
                    nativeButton={false}
                    variant="outline"
                    size="lg"
                    className="rounded-full px-7"
                >
                    <Home className="mr-2 size-4" />
                    {t('goHome')}
                </Button>
            </div>
        </div>
    );
}
