'use client';

import {useEffect, useState} from 'react';

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
    const [khmer, setKhmer] = useState(false);

    useEffect(() => {
        console.error('Root layout error', error.digest ?? '', error);
        setKhmer(window.location.pathname === '/km' || window.location.pathname.startsWith('/km/'));
    }, [error]);

    const copy = khmer ? {
        title: 'មានបញ្ហាកើតឡើង',
        message: 'មិនអាចផ្ទុកទំព័របានទេ។ សូមព្យាយាមម្ដងទៀត។',
        reference: 'លេខយោង',
        retry: 'ព្យាយាមម្ដងទៀត',
    } : {
        title: 'Something went wrong',
        message: 'The page could not be loaded. Please try again.',
        reference: 'Reference',
        retry: 'Try again',
    };

    return (
        <html lang={khmer ? 'km' : 'en'}>
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8faff',
                    color: '#101828',
                    fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
                    padding: '2rem',
                    boxSizing: 'border-box',
                }}
            >
                <main
                    style={{
                        width: '100%',
                        maxWidth: '36rem',
                        padding: '3rem',
                        border: '1px solid #d8e1ef',
                        borderRadius: '1rem',
                        background: 'rgba(255, 255, 255, 0.78)',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                    }}
                >
                    <p style={{margin: 0, color: '#0866d8', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase'}}>
                        Lumé
                    </p>
                    <h1 style={{fontSize: '2.25rem', lineHeight: 1.15, fontWeight: 700, margin: '0.75rem 0 0'}}>
                        {copy.title}
                    </h1>
                    <p style={{marginTop: '1rem', lineHeight: 1.6, color: '#667085'}}>
                        {copy.message}
                    </p>
                    {error.digest ? (
                        <p style={{marginTop: '1.25rem', fontSize: '0.75rem', color: '#7c8799'}}>
                            {copy.reference}: {error.digest}
                        </p>
                    ) : null}
                    <button
                        onClick={reset}
                        style={{
                            marginTop: '1.75rem',
                            padding: '0.75rem 1.75rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: '#0866d8',
                            color: '#fff',
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                        }}
                    >
                        {copy.retry}
                    </button>
                </main>
            </body>
        </html>
    );
}
