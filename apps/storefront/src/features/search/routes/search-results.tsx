import {Suspense} from "react";
import {getRouteLocale} from "@/platform/i18n/server";
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {FacetFilters} from '@/features/search/facet-filters';
import {ProductGridSkeleton} from '@/features/products/product-grid-skeleton';
import {ProductGrid} from '@/features/products/product-grid';
import {buildSearchInput, getCurrentPage} from "@/features/search/search-helpers";
import {query} from "@/platform/vendure/api";
import {SearchProductsQuery} from '@/features/search/graphql';

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
    const page = getCurrentPage(searchParamsResolved);

    const productDataPromise = query(SearchProductsQuery, {
        input: buildSearchInput({searchParams: searchParamsResolved})
    }, {languageCode: locale, currencyCode});


    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            {/* Filters Sidebar */}
            <aside className="empty:hidden max-lg:sticky max-lg:top-16 max-lg:z-30 max-lg:-mx-1 max-lg:bg-background/95 max-lg:px-1 max-lg:py-2 max-lg:backdrop-blur-xl lg:w-64 lg:shrink-0">
                <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg"/>}>
                    <FacetFilters productDataPromise={productDataPromise}/>
                </Suspense>
            </aside>

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
