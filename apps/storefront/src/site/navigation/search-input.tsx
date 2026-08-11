'use client';

import {useState, useEffect, useRef, useTransition} from 'react';
import Image from 'next/image';
import {useSearchParams} from 'next/navigation';
import {useRouter} from '@/platform/i18n/navigation';
import {Link} from '@/platform/i18n/navigation';
import {Loader2, Search} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {useTranslations} from 'next-intl';
import {Price} from '@/features/pricing/price';
import {fetchSearchSuggestions, type SuggestionResult} from '@/features/search/suggestions';

const DEBOUNCE_MS = 200;
const MIN_QUERY = 2;

export function SearchInput() {
    const t = useTranslations('Navigation');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
    const [suggestions, setSuggestions] = useState<SuggestionResult>({items: [], totalItems: 0});
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    /** Index into the suggestion list for keyboard navigation; -1 is the input itself. */
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    /** Guards against a slow request overwriting the results of a newer one. */
    const requestId = useRef(0);

    useEffect(() => {
        setSearchValue(searchParams.get('q') || '');
        setOpen(false);
    }, [searchParams]);

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
            const result = await fetchSearchSuggestions(term);
            // Ignore anything that is not the most recent request.
            if (id !== requestId.current) return;
            setSuggestions(result);
            setActiveIndex(-1);
            setLoading(false);
        }, DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [searchValue]);

    // Close on an outside click, the way every other combobox behaves.
    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, []);

    const submit = (term: string) => {
        if (!term.trim()) return;
        setOpen(false);
        startTransition(() => {
            router.push(`/search?q=${encodeURIComponent(term.trim())}`);
        });
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        const items = suggestions.items;
        if (event.key === 'Escape') {
            setOpen(false);
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
        }
    };

    const showPanel = open && searchValue.trim().length >= MIN_QUERY;

    return (
        <div ref={containerRef} className="relative w-full max-w-md">
            <form
                onSubmit={event => {
                    event.preventDefault();
                    submit(searchValue);
                }}
                role="search"
            >
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={t('searchProducts')}
                    className="h-10 w-full rounded-full border-transparent bg-muted pl-10 pr-9 transition-colors focus-visible:border-transparent focus-visible:bg-card"
                    value={searchValue}
                    onChange={event => {
                        setSearchValue(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    disabled={isPending}
                    role="combobox"
                    aria-expanded={showPanel}
                    aria-controls="search-suggestions"
                    aria-autocomplete="list"
                    autoComplete="off"
                />
                {loading ? (
                    <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
            </form>

            {showPanel ? (
                <div
                    id="search-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-border bg-popover elevate-3"
                >
                    {suggestions.items.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm font-light text-muted-foreground">
                            {loading ? t('searching') : t('noSuggestions')}
                        </p>
                    ) : (
                        <>
                            <ul className="max-h-[22rem] overflow-y-auto py-1">
                                {suggestions.items.map((item, index) => (
                                    <li key={item.productId}>
                                        <Link
                                            href={`/product/${item.slug}`}
                                            role="option"
                                            aria-selected={index === activeIndex}
                                            onClick={() => setOpen(false)}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            className={`flex items-center gap-3 px-3 py-2 transition-colors ${
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
                                className="w-full border-t border-border px-4 py-2.5 text-left text-sm text-primary transition-colors hover:bg-accent"
                            >
                                {t('viewAllResults', {count: suggestions.totalItems})}
                            </button>
                        </>
                    )}
                </div>
            ) : null}
        </div>
    );
}
