import {ResultOf} from '@/platform/vendure/graphql';
import {ProductCard} from './components/product-card';
import {Pagination} from './components/pagination';
import {SortDropdown} from '@/features/search/sort-dropdown';
import {SearchProductsQuery} from '@/features/search/graphql';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {Button} from '@/components/ui/button';
import {Link} from '@/platform/i18n/navigation';
import {Camera, PackageSearch} from 'lucide-react';
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from '@/components/ui/empty';

interface ProductGridProps {
    productDataPromise: Promise<{
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    }>;
    currentPage: number;
    take: number;
    searchTerm?: string;
}

export async function ProductGrid({productDataPromise, currentPage, take, searchTerm}: ProductGridProps) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Product'});
    const result = await productDataPromise;

    const searchResult = result.data.search;
    const totalPages = Math.ceil(searchResult.totalItems / take);

    if (!searchResult.items.length) {
        return (
            <Empty className="rounded-xl border border-border px-6 py-16" role="status">
                <EmptyHeader>
                <EmptyMedia variant="icon" className="size-14 rounded-full">
                    <PackageSearch className="size-7 text-muted-foreground"/>
                </EmptyMedia>
                <EmptyTitle role="heading" aria-level={2}>
                    {searchTerm ? t('noProductsFor', {query: searchTerm}) : t('noProductsFound')}
                </EmptyTitle>
                <EmptyDescription>{t('noProductsFoundHint')}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button nativeButton={false} render={<Link href="/search"/>} size="lg" className="min-h-11 rounded-lg">
                        {t('viewAllProducts')}
                    </Button>
                    <Button nativeButton={false} render={<Link href="/visual-search"/>} variant="outline" size="lg" className="min-h-11 rounded-lg">
                        <Camera className="mr-2 size-4"/>
                        {t('tryVisualSearch')}
                    </Button>
                </div>
                </EmptyContent>
            </Empty>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {t('productCount', {count: searchResult.totalItems})}
                </p>
                <SortDropdown/>
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                {searchResult.items.map((product, i) => (
                    <ProductCard key={'product-grid-item' + i} product={product} priority={i < 4}/>
                ))}
            </div>

            {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages}/>
            )}
        </div>
    );
}
