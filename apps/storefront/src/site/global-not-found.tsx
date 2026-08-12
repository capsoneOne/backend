import type {Metadata} from 'next';

export const metadata: Metadata = {
    title: 'Page not found | StyleMatch',
    description: 'The requested storefront page could not be found.',
};

/**
 * Unmatched URLs bypass the locale root layout in Next.js, so this document
 * deliberately carries the essential StyleMatch tokens inline.
 */
export default function GlobalNotFound() {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    boxSizing: 'border-box',
                    background: '#f8faff',
                    color: '#101828',
                    fontFamily: 'Ubuntu, system-ui, -apple-system, sans-serif',
                }}
            >
                <main
                    style={{
                        width: '100%',
                        maxWidth: '48rem',
                        padding: '3rem',
                        border: '1px solid #d8e1ef',
                        borderRadius: '1rem',
                        background: 'rgba(255, 255, 255, 0.78)',
                        boxSizing: 'border-box',
                    }}
                >
                    <p style={{margin: 0, color: '#0866d8', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase'}}>
                        404 · StyleMatch
                    </p>
                    <h1 style={{margin: '0.85rem 0 0', maxWidth: '34rem', fontSize: 'clamp(2.25rem, 7vw, 3.75rem)', lineHeight: 1.05, fontWeight: 700, letterSpacing: '-0.02em'}}>
                        Page not found
                    </h1>
                    <p style={{margin: '1rem 0 0', maxWidth: '32rem', color: '#667085', fontSize: '1.125rem', fontWeight: 300, lineHeight: 1.65}}>
                        The page may have moved or no longer exists. Return to the storefront or continue browsing the catalogue.
                    </p>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '2rem'}}>
                        <a
                            href="/"
                            style={{display: 'inline-flex', minHeight: '3rem', alignItems: 'center', borderRadius: '0.5rem', background: '#0866d8', color: '#fff', padding: '0 1.5rem', fontWeight: 500, textDecoration: 'none'}}
                        >
                            Go to homepage
                        </a>
                        <a
                            href="/search"
                            style={{display: 'inline-flex', minHeight: '3rem', alignItems: 'center', border: '1px solid #d8e1ef', borderRadius: '0.5rem', background: '#fff', color: '#101828', padding: '0 1.5rem', fontWeight: 500, textDecoration: 'none'}}
                        >
                            Browse products
                        </a>
                    </div>
                </main>
            </body>
        </html>
    );
}
