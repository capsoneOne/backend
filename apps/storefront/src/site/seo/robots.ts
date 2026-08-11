import type {MetadataRoute} from 'next';
import {SITE_URL, buildCanonicalUrl} from '@/config/metadata';

/**
 * Crawl rules.
 *
 * The disallow list mirrors the routes that already emit `noindex` in their
 * metadata — keeping both in sync matters, because `noindex` only works if the
 * crawler is allowed to fetch the page and read the tag, while `Disallow` stops
 * the fetch entirely. Belt and braces on genuinely private paths; `noindex`
 * alone on anything we still want crawled for link discovery.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/*/account/',
                    '/*/cart',
                    '/*/checkout',
                    '/*/order-confirmation/',
                    '/*/sign-in',
                    '/*/register',
                    '/*/forgot-password',
                    '/*/reset-password',
                    '/*/verify',
                    '/*/verify-pending',
                ],
            },
        ],
        sitemap: buildCanonicalUrl('/sitemap.xml'),
        host: SITE_URL,
    };
}
