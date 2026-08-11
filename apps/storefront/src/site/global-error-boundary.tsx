'use client';

import {useEffect} from 'react';

/**
 * The last-resort boundary, for errors thrown by the root layout itself.
 *
 * It replaces the entire document, so it must render its own <html> and <body>
 * and cannot rely on the app's fonts, providers or Tailwind theme tokens — none
 * of them are guaranteed to have mounted. Everything here is inline and
 * self-contained on purpose.
 */
export default function GlobalErrorBoundary({
    error,
    reset,
}: {
    error: Error & {digest?: string};
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Root layout error', error.digest ?? '', error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fafafa',
                    color: '#101010',
                    fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
                    padding: '2rem',
                }}
            >
                <main style={{maxWidth: '28rem', textAlign: 'center'}}>
                    <h1 style={{fontSize: '1.75rem', fontWeight: 700, margin: 0}}>
                        Something went wrong
                    </h1>
                    <p style={{marginTop: '0.75rem', lineHeight: 1.6, color: '#555'}}>
                        The page could not be loaded. Please try again.
                    </p>
                    {error.digest ? (
                        <p style={{marginTop: '1.25rem', fontSize: '0.75rem', color: '#888'}}>
                            Reference: {error.digest}
                        </p>
                    ) : null}
                    <button
                        onClick={reset}
                        style={{
                            marginTop: '1.75rem',
                            padding: '0.75rem 1.75rem',
                            borderRadius: '999px',
                            border: 'none',
                            background: '#f45034',
                            color: '#fff',
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </main>
            </body>
        </html>
    );
}
