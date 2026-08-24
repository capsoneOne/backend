import {NextResponse} from 'next/server';

/**
 * Liveness probe for the platform health check.
 *
 * Exists because every page route lives under `[locale]`, so `/` only ever answers with
 * a redirect — which a health checker may or may not treat as healthy. This answers 200
 * directly and depends on nothing: it reports that Next is serving, not that the API or
 * the database are reachable. Those have their own checks, and coupling them here would
 * make the storefront restart itself over a backend outage it cannot fix.
 */
export const dynamic = 'force-dynamic';

export function GET() {
    return NextResponse.json({status: 'ok'});
}
