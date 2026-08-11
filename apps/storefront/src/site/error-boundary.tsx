'use client';

import {useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {AlertTriangle, Home, RotateCcw} from 'lucide-react';

/**
 * The segment-level error boundary.
 *
 * Without this, any throw inside a route segment — most commonly the Vendure API
 * being unreachable — renders Next.js's bare "A server error occurred" screen,
 * with no header, no footer and no way back into the store. Copy is hardcoded
 * English rather than translated: `next-intl` reads messages from the request
 * context, and the context is exactly what may have failed to load.
 */
export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & {digest?: string};
    reset: () => void;
}) {
    useEffect(() => {
        // Server digests are the only handle on the original stack in production.
        console.error('Route error', error.digest ?? '', error);
    }, [error]);

    return (
        <div className="container mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
            <div className="flex size-16 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <AlertTriangle className="size-7" />
            </div>

            <h1 className="mt-8 text-3xl font-bold">Something went wrong</h1>
            <p className="mt-3 font-light leading-relaxed text-muted-foreground">
                We could not load this page. This is usually temporary — try again in a
                moment, and if it keeps happening, head back to the home page.
            </p>

            {error.digest ? (
                <p className="mt-6 font-mono text-xs text-muted-foreground/70">
                    Reference: {error.digest}
                </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={reset} size="lg" className="rounded-full px-7">
                    <RotateCcw className="mr-2 size-4" />
                    Try again
                </Button>
                <Button
                    render={<a href="/" />}
                    nativeButton={false}
                    variant="outline"
                    size="lg"
                    className="rounded-full px-7"
                >
                    <Home className="mr-2 size-4" />
                    Go home
                </Button>
            </div>
        </div>
    );
}
