'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';

/**
 * A client-side wishlist, persisted to localStorage.
 *
 * Vendure's Shop API has no wishlist mutation, and adding one means a server
 * plugin with its own entity and migration. Keeping the list on the device gets
 * the feature working for signed-out shoppers too — the majority of traffic on a
 * storefront — at the cost of not syncing across devices. If a server-side list
 * lands later, this provider is the only thing that has to change: every
 * consumer goes through `useWishlist`.
 */
export interface WishlistItem {
    productId: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    price: number;
    currencyCode: string;
    /** Epoch ms, so the list can be shown newest-first. */
    addedAt: number;
}

interface WishlistValue {
    items: WishlistItem[];
    /** False until localStorage has been read, so the UI never flashes an empty heart. */
    ready: boolean;
    has: (productId: string) => boolean;
    toggle: (item: Omit<WishlistItem, 'addedAt'>) => boolean;
    remove: (productId: string) => void;
    clear: () => void;
}

const STORAGE_KEY = 'visual-search.wishlist.v1';
const CHANGE_EVENT = 'visual-search:wishlist';

const WishlistContext = createContext<WishlistValue | null>(null);

function read(): WishlistItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        // Anything can be in localStorage — another tab, an older build, a user
        // poking at devtools. Validate rather than trust the shape.
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (entry): entry is WishlistItem =>
                !!entry &&
                typeof entry === 'object' &&
                typeof (entry as WishlistItem).productId === 'string' &&
                typeof (entry as WishlistItem).slug === 'string',
        );
    } catch {
        return [];
    }
}

function write(items: WishlistItem[]) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
        // Quota exceeded or storage disabled (Safari private mode). The list still
        // works for this page view; it just will not survive a reload.
    }
    // Keeps multiple providers on the same page in step — the navbar counter and
    // the tile buttons are separate React trees under different Suspense
    // boundaries, so state alone does not reach both.
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function WishlistProvider({children}: {children: React.ReactNode}) {
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setItems(read());
        setReady(true);

        const sync = () => setItems(read());
        window.addEventListener(CHANGE_EVENT, sync);
        // `storage` fires only in *other* tabs, which is exactly what we want here.
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(CHANGE_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    const has = useCallback(
        (productId: string) => items.some(item => item.productId === productId),
        [items],
    );

    const toggle = useCallback((item: Omit<WishlistItem, 'addedAt'>) => {
        const current = read();
        const exists = current.some(entry => entry.productId === item.productId);
        const next = exists
            ? current.filter(entry => entry.productId !== item.productId)
            : [{...item, addedAt: Date.now()}, ...current];
        setItems(next);
        write(next);
        return !exists;
    }, []);

    const remove = useCallback((productId: string) => {
        const next = read().filter(entry => entry.productId !== productId);
        setItems(next);
        write(next);
    }, []);

    const clear = useCallback(() => {
        setItems([]);
        write([]);
    }, []);

    const value = useMemo(
        () => ({items, ready, has, toggle, remove, clear}),
        [items, ready, has, toggle, remove, clear],
    );

    return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (!context) throw new Error('useWishlist must be used inside a WishlistProvider');
    return context;
}
