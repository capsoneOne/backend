import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/site/i18n/request.ts');

const nextConfig: NextConfig = {
    cacheComponents: true,
    async redirects() {
        return [
            {
                source: '/collection/featured',
                destination: '/featured',
                permanent: true,
            },
            {
                source: '/:locale/collection/featured',
                destination: '/:locale/featured',
                permanent: true,
            },
        ];
    },
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
            }
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
