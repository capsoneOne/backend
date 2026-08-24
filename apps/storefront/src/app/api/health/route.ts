import {NextResponse} from 'next/server';

/**
 * Liveness probe for the platform health check.
 *
 * Exists because every page route lives under `[locale]`, so `/` only ever answers with
 * a redirect — which a health checker may or may not treat as healthy. This answers 200
 * directly and depends on nothing: it reports that Next is serving, not that the API or
 * the database are reachable. Those have their own checks, and coupling them here would
 * make the storefront restart itself over a backend outage it cannot fix.
 *
 * No `export const dynamic` here: next.config.ts enables `cacheComponents`, and the
 * route segment config is rejected under it. The handler needs nothing dynamic anyway —
 * it returns a constant, and a prerendered 200 answers the probe just as well.
 */
export function GET() {
    return NextResponse.json({status: 'ok'});
}
