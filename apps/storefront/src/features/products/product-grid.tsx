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

interface ProductGridProps {
    productDataPromise: Promise<{
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    }>;
    currentPage: number;
    take: number;
}

export async function ProductGrid({productDataPromise, currentPage, take}: ProductGridProps) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Product'});
    const result = await productDataPromise;

    const searchResult = result.data.search;
    const totalPages = Math.ceil(searchResult.totalItems / take);

    if (!searchResult.items.length) {
        return (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border px-6 py-16 text-center">
                <div className="rounded-full bg-muted p-4">
                    <PackageSearch className="size-7 text-muted-foreground"/>
                </div>
                <div className="space-y-1">
                    <p className="font-medium">{t('noProductsFound')}</p>
                    <p className="text-sm text-muted-foreground">{t('noProductsFoundHint')}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <Button nativeButton={false} render={<Link href="/search"/>}>
                        {t('viewAllProducts')}
                    </Button>
                    <Button nativeButton={false} render={<Link href="/visual-search"/>} variant="outline">
                        <Camera className="mr-2 size-4"/>
                        {t('tryVisualSearch')}
                    </Button>
                </div>
            </div>
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
