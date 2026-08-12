'use client';

import {use, useState, useTransition} from 'react';
import {useSearchParams} from 'next/navigation';
import {usePathname, useRouter} from '@/platform/i18n/navigation';
import {ResultOf} from '@/platform/vendure/graphql';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import {Collapsible, CollapsibleTrigger, CollapsibleContent} from '@/components/ui/collapsible';
import {SlidersHorizontal, ChevronDown, X} from 'lucide-react';
import {SearchProductsQuery} from '@/features/search/graphql';
import {useTranslations} from 'next-intl';

interface FacetFiltersProps {
    productDataPromise: Promise<{
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    }>;
}

interface FacetGroup {
    id: string;
    name: string;
    values: Array<{id: string; name: string; count: number}>;
}

const FILTER_COLOURS: Record<string, string> = {
    black: '#171717', white: '#ffffff', grey: '#9ca3af', gray: '#9ca3af', red: '#dc2626',
    blue: '#2563eb', green: '#16a34a', yellow: '#eab308', orange: '#ea580c', purple: '#9333ea',
    pink: '#ec4899', brown: '#7c4a2d', beige: '#d6c4a8', navy: '#172554', cream: '#fff7e6',
};

function isColourFacet(name: string) {
    return /colou?r|shade/i.test(name);
}

function isFacetSelected(selectedFacets: string[], facetId: string, valueId: string) {
    return selectedFacets.includes(`${facetId}:${valueId}`) || selectedFacets.includes(valueId);
}

function toggleFacetSelection(selectedFacets: string[], facetId: string, valueId: string) {
    const token = `${facetId}:${valueId}`;
    if (isFacetSelected(selectedFacets, facetId, valueId)) {
        return selectedFacets.filter(id => id !== token && id !== valueId);
    }
    return [...selectedFacets, token];
}

function FilterContent({
    facetGroups,
    selectedFacets,
    toggleFacet,
    clearFilters,
    hasActiveFilters,
    inStockOnly,
    toggleStock,
    idPrefix,
    showHeading = true,
}: {
    facetGroups: Record<string, FacetGroup>;
    selectedFacets: string[];
    toggleFacet: (facetId: string, valueId: string) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
    inStockOnly: boolean;
    toggleStock: () => void;
    idPrefix: string;
    showHeading?: boolean;
}) {
    const t = useTranslations('Filters');
    const stockId = `${idPrefix}-in-stock`;

    return (
        <div className="space-y-4">
            {showHeading ? (
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{t('title')}</h2>
                    {hasActiveFilters ? (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                            {t('clearAll')}
                        </Button>
                    ) : null}
                </div>
            ) : null}

            <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                    <Checkbox
                        id={stockId}
                        checked={inStockOnly}
                        onCheckedChange={toggleStock}
                    />
                    <Label htmlFor={stockId} className="cursor-pointer text-sm font-medium">
                        {t('inStockOnly')}
                    </Label>
                </div>
            </div>

            {Object.entries(facetGroups).map(([facetName, facet]) => {
                const selectedCount = facet.values.filter(value =>
                    isFacetSelected(selectedFacets, facet.id, value.id),
                ).length;

                return (
                    <Collapsible key={facet.id} defaultOpen>
                        <div className="space-y-2 border-b border-border/60 pb-2 last:border-0">
                            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium transition-colors hover:text-foreground">
                                <span className="flex items-center gap-2">
                                    {facetName}
                                    {selectedCount > 0 ? (
                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                            {selectedCount}
                                        </span>
                                    ) : null}
                                </span>
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-panel-open]_&]:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="space-y-1 pb-2">
                                    {facet.values.map((value) => {
                                        const inputId = `${idPrefix}-${value.id}`;
                                        const isChecked = isFacetSelected(selectedFacets, facet.id, value.id);
                                        return (
                                            <div key={value.id} className="flex min-h-10 items-center gap-3 rounded-lg px-2 hover:bg-muted/60">
                                                <Checkbox
                                                    id={inputId}
                                                    checked={isChecked}
                                                    onCheckedChange={() => toggleFacet(facet.id, value.id)}
                                                />
                                                <Label
                                                    htmlFor={inputId}
                                                    className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-normal"
                                                >
                                                    {isColourFacet(facetName) && FILTER_COLOURS[value.name.toLowerCase()] ? (
                                                        <span
                                                            className="size-4 rounded-full border border-black/15 shadow-inner"
                                                            style={{backgroundColor: FILTER_COLOURS[value.name.toLowerCase()]}}
                                                            aria-hidden="true"
                                                        />
                                                    ) : null}
                                                    <span className="flex-1">{value.name}</span>
                                                    <span className="text-xs tabular-nums text-muted-foreground">
                                                        {value.count}
                                                    </span>
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CollapsibleContent>
                        </div>
                    </Collapsible>
                );
            })}
        </div>
    );
}

export function FacetFilters({productDataPromise}: FacetFiltersProps) {
    const t = useTranslations('Filters');
    const result = use(productDataPromise);
    const searchResult = result.data.search;
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isApplying, startApplying] = useTransition();

    const facetGroups = searchResult.facetValues.reduce((acc: Record<string, FacetGroup>, item) => {
        const facetName = item.facetValue.facet.name;
        if (!acc[facetName]) {
            acc[facetName] = {
                id: item.facetValue.facet.id,
                name: facetName,
                values: [],
            };
        }
        acc[facetName].values.push({
            id: item.facetValue.id,
            name: item.facetValue.name,
            count: item.count,
        });
        return acc;
    }, {});

    const selectedFacets = searchParams.getAll('facets');
    const inStockOnly = searchParams.get('inStock') === 'true';
    const [draftFacets, setDraftFacets] = useState(selectedFacets);
    const [draftInStockOnly, setDraftInStockOnly] = useState(inStockOnly);
    const activeCount = selectedFacets.length + (inStockOnly ? 1 : 0);
    const draftCount = draftFacets.length + (draftInStockOnly ? 1 : 0);

    const navigateToFilters = (facets: string[], stockOnly: boolean) => {
        const params = new URLSearchParams(searchParams);
        params.delete('facets');
        facets.forEach(id => params.append('facets', id));
        if (stockOnly) params.set('inStock', 'true');
        else params.delete('inStock');
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    const toggleAppliedFacet = (facetId: string, valueId: string) => {
        navigateToFilters(toggleFacetSelection(selectedFacets, facetId, valueId), inStockOnly);
    };

    const clearAppliedFilters = () => navigateToFilters([], false);

    const handleDrawerOpenChange = (open: boolean) => {
        if (open) {
            setDraftFacets(selectedFacets);
            setDraftInStockOnly(inStockOnly);
        }
        setDrawerOpen(open);
    };

    const applyDraftFilters = () => {
        startApplying(() => {
            navigateToFilters(draftFacets, draftInStockOnly);
            setDrawerOpen(false);
        });
    };

    const activeFacetValues = Object.values(facetGroups).flatMap(facet =>
        facet.values
            .filter(value => isFacetSelected(selectedFacets, facet.id, value.id))
            .map(value => ({facetId: facet.id, valueId: value.id, name: value.name})),
    );

    return (
        <>
            <div className="space-y-2 lg:hidden">
                <Drawer open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
                    <DrawerTrigger asChild>
                        <Button variant="outline" className="h-11 w-full justify-between rounded-xl bg-background shadow-sm">
                            <span className="inline-flex items-center">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                {t('filtersButton')}
                            </span>
                            {activeCount > 0 ? (
                                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                                    {activeCount}
                                </span>
                            ) : null}
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[88dvh]">
                        <DrawerHeader className="border-b border-border/70 text-left">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <DrawerTitle className="text-lg font-semibold">{t('title')}</DrawerTitle>
                                    <DrawerDescription>{t('description')}</DrawerDescription>
                                </div>
                                {draftCount > 0 ? (
                                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                        {t('selectedCount', {count: draftCount})}
                                    </span>
                                ) : null}
                            </div>
                        </DrawerHeader>
                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 overscroll-contain">
                            <FilterContent
                                facetGroups={facetGroups}
                                selectedFacets={draftFacets}
                                toggleFacet={(facetId, valueId) =>
                                    setDraftFacets(current => toggleFacetSelection(current, facetId, valueId))
                                }
                                clearFilters={() => {
                                    setDraftFacets([]);
                                    setDraftInStockOnly(false);
                                }}
                                hasActiveFilters={draftCount > 0}
                                inStockOnly={draftInStockOnly}
                                toggleStock={() => setDraftInStockOnly(current => !current)}
                                idPrefix="mobile-filter"
                                showHeading={false}
                            />
                        </div>
                        <DrawerFooter className="border-t border-border/70 bg-background pb-[calc(1rem+env(safe-area-inset-bottom))]">
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-12 rounded-xl"
                                    disabled={draftCount === 0 || isApplying}
                                    onClick={() => {
                                        setDraftFacets([]);
                                        setDraftInStockOnly(false);
                                    }}
                                >
                                    {t('clearAll')}
                                </Button>
                                <Button
                                    size="lg"
                                    className="h-12 flex-1 rounded-xl text-base font-semibold"
                                    disabled={isApplying}
                                    onClick={applyDraftFilters}
                                >
                                    {isApplying ? t('applying') : t('applyFilters', {count: draftCount})}
                                </Button>
                            </div>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>

                {activeCount > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t('activeFilters')}>
                        {inStockOnly ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="shrink-0 rounded-full"
                                aria-label={t('removeFilter', {name: t('inStockOnly')})}
                                onClick={() => navigateToFilters(selectedFacets, false)}
                            >
                                {t('inStockOnly')}
                                <X className="size-3.5" />
                            </Button>
                        ) : null}
                        {activeFacetValues.map(value => (
                            <Button
                                key={`${value.facetId}:${value.valueId}`}
                                variant="secondary"
                                size="sm"
                                className="shrink-0 rounded-full"
                                aria-label={t('removeFilter', {name: value.name})}
                                onClick={() => toggleAppliedFacet(value.facetId, value.valueId)}
                            >
                                {value.name}
                                <X className="size-3.5" />
                            </Button>
                        ))}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 rounded-full"
                            onClick={clearAppliedFilters}
                        >
                            {t('clearAll')}
                        </Button>
                    </div>
                ) : null}
            </div>

            <div className="hidden lg:block">
                <FilterContent
                    facetGroups={facetGroups}
                    selectedFacets={selectedFacets}
                    toggleFacet={toggleAppliedFacet}
                    clearFilters={clearAppliedFilters}
                    hasActiveFilters={activeCount > 0}
                    inStockOnly={inStockOnly}
                    toggleStock={() => navigateToFilters(selectedFacets, !inStockOnly)}
                    idPrefix="desktop-filter"
                />
            </div>
        </>
    );
}
