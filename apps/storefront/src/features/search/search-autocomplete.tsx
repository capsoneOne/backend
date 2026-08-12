'use client';

import {useId, useState, useEffect, useRef, useTransition} from 'react';
import Image from 'next/image';
import {useSearchParams} from 'next/navigation';
import {usePathname, useRouter} from '@/platform/i18n/navigation';
import {Link} from '@/platform/i18n/navigation';
import {ArrowRight, Camera, Loader2, Search, X} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Price} from '@/features/pricing/price';
import {fetchSearchSuggestions, type SuggestionResult} from '@/features/search/suggestions';
import {VisualSearchQuickUpload} from '@/features/visual-search';
import {getCollectionPath} from '@/features/collections/paths';
import {SearchCategoryFilter, type SearchCategory} from '@/features/search/search-category-filter';
import {cn} from '@/lib/utils';

const DEBOUNCE_MS = 200;
const MIN_QUERY = 2;

function getCategoryFromPath(pathname: string, categories: SearchCategory[]) {
    if (!pathname.startsWith('/collection/')) return '';
    const slug = pathname.split('/')[2] ?? '';
    return categories.some(category =>
        category.slug === slug || category.children?.some(child => child.slug === slug),
    ) ? slug : '';
}

export function SearchAutocomplete({
    categories,
    className,
}: {
    categories: SearchCategory[];
    className?: string;
}) {
    const t = useTranslations('SearchSuggestions');
    const router = useRouter();
    const pathname = usePathname();
    const listboxId = useId();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
    const [categorySlug, setCategorySlug] = useState(() => getCategoryFromPath(pathname, categories));
    const [suggestions, setSuggestions] = useState<SuggestionResult>({items: [], totalItems: 0});
    const [open, setOpen] = useState(false);
    const [imageOpen, setImageOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    /** Index into the suggestion list for keyboard navigation; -1 is the input itself. */
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    /** Guards against a slow request overwriting the results of a newer one. */
    const requestId = useRef(0);

    useEffect(() => {
        setSearchValue(searchParams.get('q') || '');
        setCategorySlug(getCategoryFromPath(pathname, categories));
        setOpen(false);
        setImageOpen(false);
    }, [categories, pathname, searchParams]);

    useEffect(() => {
        const term = searchValue.trim();
        if (term.length < MIN_QUERY) {
            setSuggestions({items: [], totalItems: 0});
            setLoading(false);
            return;
        }

        setLoading(true);
        const id = ++requestId.current;
        const timer = window.setTimeout(async () => {
            const result = await fetchSearchSuggestions(term, categorySlug || undefined);
            // Ignore anything that is not the most recent request.
            if (id !== requestId.current) return;
            setSuggestions(result);
            setActiveIndex(-1);
            setLoading(false);
        }, DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [categorySlug, searchValue]);

    // Close on an outside click, the way every other combobox behaves.
    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
                setImageOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, []);

    const submit = (term: string) => {
        if (!term.trim()) return;
        setOpen(false);
        setImageOpen(false);
        startTransition(() => {
            const destination = categorySlug ? getCollectionPath(categorySlug) : '/search';
            router.push(`${destination}?q=${encodeURIComponent(term.trim())}`);
        });
    };

    const selectedCategoryName = categories
        .flatMap(category => [category, ...(category.children ?? [])])
        .find(category => category.slug === categorySlug)?.name ?? t('allProducts');

    const handleKeyDown = (event: React.KeyboardEvent) => {
        const items = suggestions.items;
        if (event.key === 'Escape') {
            setOpen(false);
            setImageOpen(false);
            setActiveIndex(-1);
            return;
        }
        if (!open || items.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex(index => (index + 1) % items.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(index => (index <= 0 ? items.length - 1 : index - 1));
        } else if (event.key === 'Enter' && activeIndex >= 0) {
            // Enter on a highlighted suggestion opens that product rather than
            // running a text search for whatever is in the box.
            event.preventDefault();
            setOpen(false);
            router.push(`/product/${items[activeIndex].slug}`);
        } else if (event.key === 'Home') {
            event.preventDefault();
            setActiveIndex(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            setActiveIndex(items.length - 1);
        }
    };

    const showPanel = open && !imageOpen && searchValue.trim().length >= MIN_QUERY;

    return (
        <div ref={containerRef} className={cn('relative w-full max-w-lg', className)}>
            <form
                onSubmit={event => {
                    event.preventDefault();
                    submit(searchValue);
                }}
                role="search"
                className="flex h-11 items-stretch overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-xs transition-[border-color,box-shadow,background-color] focus-within:border-primary/45 focus-within:bg-card focus-within:ring-3 focus-within:ring-primary/10"
            >
                <div className="hidden sm:block">
                    <SearchCategoryFilter
                        categories={categories}
                        value={categorySlug}
                        onValueChange={value => {
                            setCategorySlug(value);
                            setImageOpen(false);
                            setOpen(searchValue.trim().length >= MIN_QUERY);
                            setActiveIndex(-1);
                        }}
                        onOpenChange={isOpen => {
                            if (isOpen) {
                                setOpen(false);
                                setImageOpen(false);
                            }
                        }}
                    />
                </div>

                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        placeholder={t('searchProducts')}
                        className="h-full w-full bg-transparent pl-10 pr-24 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        value={searchValue}
                        onChange={event => {
                            setSearchValue(event.target.value);
                            setOpen(true);
                            setActiveIndex(-1);
                        }}
                        onFocus={() => {
                            setImageOpen(false);
                            setOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={isPending}
                        role="combobox"
                        aria-label={t('searchProducts')}
                        aria-expanded={showPanel || imageOpen}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${suggestions.items[activeIndex]?.productId}` : undefined}
                        aria-busy={loading}
                        autoComplete="off"
                    />
                    <div className="absolute inset-y-0 right-1 flex items-center">
                        {loading ? (
                            <Loader2 className="mr-1 size-4 animate-spin text-muted-foreground" aria-hidden="true" />
                        ) : null}
                        {searchValue ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchValue('');
                                    setSuggestions({items: [], totalItems: 0});
                                    setOpen(false);
                                    setActiveIndex(-1);
                                }}
                                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={t('clearSearch')}
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        ) : null}
                        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
                        <button
                            type="button"
                            onClick={() => {
                                setImageOpen(value => !value);
                                setOpen(false);
                            }}
                            className={cn(
                                'inline-flex size-9 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                                imageOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-primary',
                            )}
                            aria-label={t('searchByImage')}
                            aria-expanded={imageOpen}
                        >
                            <Camera className="size-4.5" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </form>

            <p className="sr-only" role="status" aria-live="polite">
                {!loading && showPanel
                    ? t('suggestionStatus', {count: suggestions.items.length})
                    : loading
                        ? t('searching')
                        : ''}
            </p>

            {showPanel ? (
                <div
                    className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-popover elevate-2"
                >
                    {suggestions.items.length === 0 ? (
                        <>
                            <ul id={listboxId} role="listbox" aria-label={t('suggestionsLabel')} />
                            <div className="px-3 py-3">
                                <p className="px-1 text-sm font-medium text-foreground">
                                    {loading ? t('searching') : t('noSuggestionsFor', {query: searchValue.trim()})}
                                </p>
                                {!loading ? (
                                    <button
                                        type="button"
                                        onClick={() => submit(searchValue)}
                                        className="mt-2 flex min-h-10 w-full items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <span>
                                            <span className="block font-medium text-primary">{t('searchFor', {query: searchValue.trim()})}</span>
                                            <span className="mt-0.5 block text-xs text-muted-foreground">{selectedCategoryName}</span>
                                        </span>
                                        <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
                                    </button>
                                ) : null}
                            </div>
                        </>
                    ) : (
                        <>
                            <ul
                                id={listboxId}
                                role="listbox"
                                aria-label={t('suggestionsLabel')}
                                className="max-h-[22rem] overflow-y-auto py-1"
                            >
                                {suggestions.items.map((item, index) => (
                                    <li key={item.productId}>
                                        <Link
                                            id={`${listboxId}-option-${item.productId}`}
                                            href={`/product/${item.slug}`}
                                            role="option"
                                            aria-selected={index === activeIndex}
                                            onClick={() => setOpen(false)}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            className={`flex min-h-14 items-center gap-3 px-3 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                                                index === activeIndex ? 'bg-accent' : ''
                                            }`}
                                        >
                                            <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                                                {item.imageUrl ? (
                                                    <Image
                                                        src={item.imageUrl}
                                                        alt=""
                                                        fill
                                                        sizes="44px"
                                                        className="object-cover"
                                                    />
                                                ) : null}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-sm">
                                                {item.productName}
                                            </span>
                                            <span className="shrink-0 text-sm font-bold tracking-tight">
                                                <Price value={item.price} currencyCode={item.currencyCode} />
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                onClick={() => submit(searchValue)}
                                className="flex min-h-11 w-full items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-left text-sm font-medium text-primary outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                            >
                                <span>{t('viewAllResults', {count: suggestions.totalItems})}</span>
                                <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                                    {selectedCategoryName}
                                    <ArrowRight className="size-4 text-primary" aria-hidden="true" />
                                </span>
                            </button>
                        </>
                    )}
                </div>
            ) : null}

            {imageOpen ? (
                <VisualSearchQuickUpload
                    onClose={() => setImageOpen(false)}
                    className="absolute right-0 top-12 z-50 w-[min(32rem,calc(100vw-2rem))]"
                />
            ) : null}
        </div>
    );
}
