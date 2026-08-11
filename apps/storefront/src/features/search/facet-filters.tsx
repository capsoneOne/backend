'use client';

import { use, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/platform/i18n/navigation';
import { ResultOf } from '@/platform/vendure/graphql';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import {SearchProductsQuery} from '@/features/search/graphql';
import {useTranslations} from 'next-intl';

interface FacetFiltersProps {
    productDataPromise: Promise<{
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    }>;
}

const FILTER_COLOURS: Record<string, string> = {
    black: '#171717', white: '#ffffff', grey: '#9ca3af', gray: '#9ca3af', red: '#dc2626',
    blue: '#2563eb', green: '#16a34a', yellow: '#eab308', orange: '#ea580c', purple: '#9333ea',
    pink: '#ec4899', brown: '#7c4a2d', beige: '#d6c4a8', navy: '#172554', cream: '#fff7e6',
};

function isColourFacet(name: string) {
    return /colou?r|shade/i.test(name);
}

function FilterContent({
    facetGroups,
    selectedFacets,
    toggleFacet,
    clearFilters,
    hasActiveFilters,
    inStockOnly,
    toggleStock,
}: {
    facetGroups: Record<string, { id: string; name: string; values: Array<{ id: string; name: string; count: number }> }>;
    selectedFacets: string[];
    toggleFacet: (facetId: string, valueId: string) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
    inStockOnly: boolean;
    toggleStock: () => void;
}) {
    const t = useTranslations('Filters');
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{t('title')}</h2>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        {t('clearAll')}
                    </Button>
                )}
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                    <Checkbox
                        id="filter-in-stock"
                        checked={inStockOnly}
                        onCheckedChange={toggleStock}
                    />
                    <Label htmlFor="filter-in-stock" className="cursor-pointer text-sm font-medium">
                        {t('inStockOnly')}
                    </Label>
                </div>
            </div>

            {Object.entries(facetGroups).map(([facetName, facet]) => (
                <Collapsible key={facet.id} defaultOpen>
                    <div className="space-y-2">
                        <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-foreground transition-colors">
                            {facetName}
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-panel-open]_&]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="space-y-2 pb-2">
                                {facet.values.map((value) => {
                                    const token = `${facet.id}:${value.id}`;
                                    const isChecked = selectedFacets.includes(token) || selectedFacets.includes(value.id);
                                    return (
                                        <div key={value.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`filter-${value.id}`}
                                                checked={isChecked}
                                                onCheckedChange={() => toggleFacet(facet.id, value.id)}
                                            />
                                            <Label
                                                htmlFor={`filter-${value.id}`}
                                                className="text-sm font-normal cursor-pointer flex items-center gap-2"
                                            >
                                                {isColourFacet(facetName) && FILTER_COLOURS[value.name.toLowerCase()] ? (
                                                    <span
                                                        className="size-4 rounded-full border border-black/15 shadow-inner"
                                                        style={{backgroundColor: FILTER_COLOURS[value.name.toLowerCase()]}}
                                                        aria-hidden="true"
                                                    />
                                                ) : null}
                                                {value.name}
                                                <span className="text-xs text-muted-foreground">
                                                    ({value.count})
                                                </span>
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>
            ))}
        </div>
    );
}

export function FacetFilters({ productDataPromise }: FacetFiltersProps) {
    const t = useTranslations('Filters');
    const result = use(productDataPromise);
    const searchResult = result.data.search;
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [sheetOpen, setSheetOpen] = useState(false);

    // Group facet values by facet
    interface FacetGroup {
        id: string;
        name: string;
        values: Array<{ id: string; name: string; count: number }>;
    }

    const facetGroups = searchResult.facetValues.reduce((acc: Record<string, FacetGroup>, item) => {
        const facetName = item.facetValue.facet.name;
        if (!acc[facetName]) {
            acc[facetName] = {
                id: item.facetValue.facet.id,
                name: facetName,
                values: []
            };
        }
        acc[facetName].values.push({
            id: item.facetValue.id,
            name: item.facetValue.name,
            count: item.count
        });
        return acc;
    }, {});

    const selectedFacets = searchParams.getAll('facets');

    const toggleFacet = (facetId: string, valueId: string) => {
        const params = new URLSearchParams(searchParams);
        const current = params.getAll('facets');
        const token = `${facetId}:${valueId}`;

        if (current.includes(token) || current.includes(valueId)) {
            params.delete('facets');
            current.filter(id => id !== token && id !== valueId).forEach(id => params.append('facets', id));
        } else {
            params.append('facets', token);
        }

        // Reset to page 1 when filters change
        params.delete('page');

        router.push(`${pathname}?${params.toString()}`);
        setSheetOpen(false);
    };

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('facets');
        params.delete('page');
        params.delete('inStock');
        router.push(`${pathname}?${params.toString()}`);
        setSheetOpen(false);
    };

    const inStockOnly = searchParams.get('inStock') === 'true';
    const toggleStock = () => {
        const params = new URLSearchParams(searchParams);
        if (inStockOnly) params.delete('inStock');
        else params.set('inStock', 'true');
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
        setSheetOpen(false);
    };
    const hasActiveFilters = selectedFacets.length > 0 || inStockOnly;

    if (Object.keys(facetGroups).length === 0) {
        return null;
    }

    const filterContentProps = {
        facetGroups,
        selectedFacets,
        toggleFacet,
        clearFilters,
        hasActiveFilters,
        inStockOnly,
        toggleStock,
    };

    return (
        <>
            {/* Mobile: Sheet trigger */}
            <div className="lg:hidden">
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger
                        render={
                            <Button variant="outline" className="w-full">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                {t('filtersButton')}
                                {hasActiveFilters && (
                                    <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                        {selectedFacets.length + (inStockOnly ? 1 : 0)}
                                    </span>
                                )}
                            </Button>
                        }
                    />
                    <SheetContent side="left" className="overflow-y-auto p-6">
                        <SheetHeader>
                            <SheetTitle>{t('title')}</SheetTitle>
                        </SheetHeader>
                        <div className="mt-4">
                            <FilterContent {...filterContentProps} />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop: Inline filters */}
            <div className="hidden lg:block">
                <FilterContent {...filterContentProps} />
            </div>
        </>
    );
}
