import {Suspense} from "react";
import {getRouteLocale} from "@/platform/i18n/server";
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {FacetFilters} from '@/features/search/facet-filters';
import {ProductGridSkeleton} from '@/features/products/product-grid-skeleton';
import {ProductGrid} from '@/features/products/product-grid';
import {buildSearchInput, getCurrentPage} from "@/features/search/search-helpers";
import {query} from "@/platform/vendure/api";
import {SearchProductsQuery} from '@/features/search/graphql';
import {getAllCollections} from '@/features/collections/data';
import {CatalogueSidebar} from '@/components/catalogue-page';
import {getTranslations} from 'next-intl/server';

interface SearchResultsProps {
    searchParams: Promise<{
        page?: string;
        q?: string;
    }>
}

export async function SearchResults({searchParams}: SearchResultsProps) {
    const searchParamsResolved = await searchParams;
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({locale, namespace: 'Search'});
    const page = getCurrentPage(searchParamsResolved);
    const categories = await getAllCollections(locale);

    const productDataPromise = query(SearchProductsQuery, {
        input: buildSearchInput({searchParams: searchParamsResolved})
    }, {languageCode: locale, currencyCode});


    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            <CatalogueSidebar
                categories={categories}
                categoryTitle={t('categories')}
                allProductsLabel={t('allProducts')}
                filters={(
                    <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted"/>}>
                        <FacetFilters productDataPromise={productDataPromise}/>
                    </Suspense>
                )}
            />

            {/* Product Grid */}
            <div className="min-w-0 flex-1">
                <Suspense fallback={<ProductGridSkeleton/>}>
                    <ProductGrid
                        productDataPromise={productDataPromise}
                        currentPage={page}
                        take={12}
                        searchTerm={typeof searchParamsResolved.q === 'string' ? searchParamsResolved.q : undefined}
                    />
                </Suspense>
            </div>
        </div>
    )
}
