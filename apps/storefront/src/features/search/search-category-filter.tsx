'use client';

import {ChevronDown, ListFilter, Search} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {cn} from '@/lib/utils';

export interface SearchCategory {
    id: string;
    name: string;
    slug: string;
    children?: Array<{id: string; name: string; slug: string}> | null;
}

export function SearchCategoryFilter({
    categories,
    value,
    onValueChange,
    onOpenChange,
    className,
}: {
    categories: SearchCategory[];
    value: string;
    onValueChange: (value: string) => void;
    onOpenChange?: (open: boolean) => void;
    className?: string;
}) {
    const t = useTranslations('SearchSuggestions');
    const selectedCategory = categories
        .flatMap(category => [category, ...(category.children ?? [])])
        .find(category => category.slug === value);

    return (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger
                render={(
                    <button
                        type="button"
                        className={cn(
                            'group/filter inline-flex h-full w-[9.25rem] shrink-0 items-center gap-2 border-r border-border/80 px-3 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                            className,
                        )}
                        aria-label={t('searchCategory')}
                    />
                )}
            >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary transition-colors group-hover/filter:bg-primary/12">
                    <ListFilter className="size-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {selectedCategory?.name ?? t('allProducts')}
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-popup-open/filter:rotate-180" aria-hidden="true" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="max-h-[min(30rem,var(--available-height))] w-[19rem] rounded-xl border border-border bg-popover p-2 shadow-none ring-0 elevate-2"
            >
                <div className="px-2 pb-2 pt-1">
                    <p className="text-sm font-medium">{t('searchScopeLabel')}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {t('searchScopeDescription')}
                    </p>
                </div>

                <DropdownMenuRadioGroup
                    value={value || 'all'}
                    onValueChange={nextValue => onValueChange(nextValue === 'all' ? '' : nextValue)}
                >
                    <DropdownMenuRadioItem
                        value="all"
                        className="min-h-11 rounded-lg px-2.5 py-2 data-checked:bg-primary/8 data-checked:text-primary"
                    >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Search className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-medium">{t('allProducts')}</span>
                            <span className="block text-xs font-normal text-muted-foreground">{t('allProductsDescription')}</span>
                        </span>
                    </DropdownMenuRadioItem>

                    <DropdownMenuSeparator className="my-2" />

                    {categories.map((category, index) => (
                        <div key={category.id}>
                            {index > 0 ? <DropdownMenuSeparator className="my-1.5" /> : null}
                            <DropdownMenuLabel className="px-2.5 pb-1 pt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                {category.name}
                            </DropdownMenuLabel>
                            <DropdownMenuRadioItem
                                value={category.slug}
                                className="min-h-10 rounded-lg px-2.5 data-checked:bg-primary/8 data-checked:text-primary"
                            >
                                <span className="font-medium">{t('allInCategory', {category: category.name})}</span>
                            </DropdownMenuRadioItem>
                            {category.children?.map(child => (
                                <DropdownMenuRadioItem
                                    key={child.id}
                                    value={child.slug}
                                    inset
                                    className="min-h-10 rounded-lg data-checked:bg-primary/8 data-checked:text-primary"
                                >
                                    {child.name}
                                </DropdownMenuRadioItem>
                            ))}
                        </div>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
