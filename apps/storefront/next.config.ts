import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/site/i18n/request.ts');

/**
 * Hostname serving product images, read from the asset base URL rather than
 * hardcoded. `next/image` refuses any remote host not listed here, so this has to
 * track wherever assets actually live — local Vendure, an R2 bucket, or a custom
 * domain later. Hardcoding the bucket would mean this file needs editing on every
 * storage change, which is exactly how it drifts out of sync.
 */
const assetHostname = (() => {
    const url = process.env.NEXT_PUBLIC_ASSET_URL ?? process.env.R2_PUBLIC_URL;
    if (!url) return undefined;
    try {
        return new URL(url).hostname;
    } catch {
        console.warn(`[images] ignoring unparseable asset URL: ${url}`);
        return undefined;
    }
})();

const nextConfig: NextConfig = {
    cacheComponents: true,
    images: {
        // This is necessary to display images from your local Vendure instance
        dangerouslyAllowLocalIP: true,
        remotePatterns: [
            {
                hostname: 'readonlydemo.vendure.io',
            },
            {
                hostname: 'demo.vendure.io'
            },
            {
                hostname: 'localhost'
            },
            // Cloudflare R2 public dev URLs. The wildcard covers the bucket-specific
            // subdomain so a rebuilt bucket does not need a config edit.
            {
                protocol: 'https',
                hostname: '*.r2.dev',
            },
            ...(assetHostname ? [{protocol: 'https' as const, hostname: assetHostname}] : []),
        ],
    },
    // No `serverActions.bodySizeLimit` override is needed. Visual search used to post
    // the query image through a server action as base64, which blew Next's 1 MB
    // default; it now uploads binary multipart to the route handler at
    // src/app/api/visual-search, which streams and has no such cap.
    //
    // `experimental.rootParams` was also removed — Next reports it "is no longer
    // needed, because next/root-params is available by default", and it was the sole
    // cause of the TS2353 error that made `npm run check-types` fail.
};

export default withNextIntl(nextConfig);
