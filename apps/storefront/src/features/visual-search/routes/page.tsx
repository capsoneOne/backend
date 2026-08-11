import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME, noIndexRobots} from '@/config/metadata';
import {VisualSearchClient} from '@/features/visual-search/components/visual-search-client';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'VisualSearch'});
    return {
        title: t('pageTitle'),
        description: t('metaDescription', {siteName: SITE_NAME}),
        // Results depend on an uploaded image, so there is nothing stable to index.
        robots: noIndexRobots(),
    };
}

export default async function VisualSearchPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'VisualSearch'});

    return (
        <div className="container mx-auto mt-16 px-4 py-16 md:py-20">
            <div className="mx-auto mb-12 max-w-2xl text-center">
                <h1 className="text-4xl font-bold md:text-5xl">{t('pageTitle')}</h1>
                <p className="mt-4 text-lg font-light text-muted-foreground">{t('pageSubtitle')}</p>
            </div>
            <VisualSearchClient />
        </div>
    );
}
