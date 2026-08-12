import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {SITE_NAME, buildCanonicalUrl} from '@/config/metadata';
import {toOgLocale} from '@/platform/i18n/locale-utils';
import {StorefrontPageHeader, StorefrontPageShell} from '@/components/catalogue-page';

/**
 * Shared shell and metadata builder for the static content pages.
 *
 * These pages are all the same shape — a title, a lede, and prose — so they
 * share one renderer. Their copy lives in the `Pages` message namespace, which
 * keeps them translatable alongside everything else instead of hardcoding
 * English into seven separate route files.
 */
export interface ContentPageKey {
    /** Message key under the `Pages` namespace. */
    key: string;
    /** Route path, for canonical URLs. */
    path: string;
}

export async function buildContentMetadata({key, path}: ContentPageKey): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Pages'});
    const title = t(`${key}.title`);
    const description = t(`${key}.lede`);

    return {
        title,
        description,
        alternates: {canonical: buildCanonicalUrl(path)},
        openGraph: {
            title: `${title} | ${SITE_NAME}`,
            description,
            type: 'article',
            locale: toOgLocale(locale),
            url: buildCanonicalUrl(path),
        },
    };
}

export async function ContentPage({
    contentKey,
    children,
}: {
    contentKey: string;
    children?: ReactNode;
}) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Pages'});

    return (
        <StorefrontPageShell className="max-w-3xl">
            <article>
                <StorefrontPageHeader
                    title={t(`${contentKey}.title`)}
                    description={t(`${contentKey}.lede`)}
                />
                {children}
            </article>
        </StorefrontPageShell>
    );
}

/**
 * A run of `section.N.heading` / `section.N.body` pairs.
 *
 * `next-intl` has no "list of unknown length" primitive, so the count is passed
 * in explicitly and asserted by the message-parity test like any other key.
 */
export async function ContentSections({
    contentKey,
    count,
}: {
    contentKey: string;
    count: number;
}) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Pages'});

    return (
        <div className="space-y-10">
            {Array.from({length: count}).map((_, index) => (
                <section key={index}>
                    <h2 className="text-xl font-medium">
                        {t(`${contentKey}.sections.${index}.heading`)}
                    </h2>
                    <p className="mt-3 font-light leading-relaxed text-muted-foreground">
                        {t(`${contentKey}.sections.${index}.body`)}
                    </p>
                </section>
            ))}
        </div>
    );
}
