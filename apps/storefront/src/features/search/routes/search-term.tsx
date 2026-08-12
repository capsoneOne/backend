import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {CataloguePageHeader, CataloguePageHeaderSkeleton} from '@/components/catalogue-page';

interface SearchTermProps {
    searchParams: Promise<{
        q?: string
    }>;
}

export async function SearchTerm({searchParams}: SearchTermProps) {
    const searchParamsResolved = await searchParams;
    const searchTerm = (searchParamsResolved.q as string) || '';
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Search'});

    return (
        <CataloguePageHeader
            eyebrow={searchTerm ? t('resultsEyebrow') : t('catalogueEyebrow')}
            title={searchTerm ? t('resultsFor', {query: searchTerm}) : t('shopAll')}
            description={searchTerm ? t('resultsDescription') : t('catalogueDescription')}
        />
    )
}

export function SearchTermSkeleton() {
    return <CataloguePageHeaderSkeleton />;
}
