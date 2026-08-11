'use client';

import {useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {AlertTriangle, Home, RotateCcw} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {StorefrontPageHeader, StorefrontPageShell} from '@/components/catalogue-page';

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
        <StorefrontPageShell className="max-w-3xl">
            <StorefrontPageHeader
                title={(
                    <span className="flex items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                            <AlertTriangle className="size-5" aria-hidden="true" />
                        </span>
                        {t('title')}
                    </span>
                )}
                description={(
                    <>
                        <p>{t('message')}</p>
                        {error.digest ? (
                            <p className="mt-3 font-mono text-xs text-muted-foreground/70">
                                {t('reference', {digest: error.digest})}
                            </p>
                        ) : null}
                    </>
                )}
                actions={(
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button onClick={reset} size="lg" className="rounded-lg px-7">
                            <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                            {t('tryAgain')}
                        </Button>
                        <Button
                            render={<a href="/" />}
                            nativeButton={false}
                            variant="outline"
                            size="lg"
                            className="rounded-lg bg-background px-7"
                        >
                            <Home className="mr-2 size-4" aria-hidden="true" />
                            {t('goHome')}
                        </Button>
                    </div>
                )}
            />
        </StorefrontPageShell>
    );
}
