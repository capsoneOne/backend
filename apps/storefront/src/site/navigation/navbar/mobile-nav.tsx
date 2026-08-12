'use client';

import {useState} from 'react';
import { Link, useRouter } from '@/platform/i18n/navigation';
import {Bell, Camera, Grid2X2, Heart, MapPin, Menu, Package, Search, Settings, ShoppingBag, ShoppingCart, User, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose,
} from '@/components/ui/sheet';
import {useTranslations} from 'next-intl';
import {VisualSearchQuickUpload} from '@/features/visual-search';
import {getCollectionPath} from '@/features/collections/paths';
import {SearchCategoryFilter} from '@/features/search/search-category-filter';
import {navbarIconClass} from '@/site/navigation/navigation-styles';
import {ThemeSwitcher} from '@/site/navigation/navbar/theme-switcher';

interface Collection {
    id: string;
    name: string;
    slug: string;
    children?: Array<{
        id: string;
        name: string;
        slug: string;
    }> | null;
}

interface MobileNavProps {
    collections: Collection[];
}

export function MobileNav({collections}: MobileNavProps) {
    const t = useTranslations('Navigation');
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [categorySlug, setCategorySlug] = useState('');
    const [imageOpen, setImageOpen] = useState(false);
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchValue.trim()) return;
        const destination = categorySlug ? getCollectionPath(categorySlug) : '/search';
        router.push(`${destination}?q=${encodeURIComponent(searchValue.trim())}`);
        setImageOpen(false);
        setOpen(false);
    };

    const handleLinkClick = () => {
        setOpen(false);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className={`${navbarIconClass} md:hidden`} />}>
                <Menu className="size-5" />
                <span className="sr-only">{t('openMenu')}</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-sm overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{t('menu')}</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-6 px-4 pb-6">
                    {/* Search */}
                    <div>
                    <form onSubmit={handleSearch} className="flex h-11 overflow-hidden rounded-xl border border-border bg-card shadow-xs focus-within:border-primary/45 focus-within:ring-3 focus-within:ring-primary/10">
                        <SearchCategoryFilter
                            categories={collections}
                            value={categorySlug}
                            onValueChange={value => setCategorySlug(value)}
                            onOpenChange={isOpen => {
                                if (isOpen) setImageOpen(false);
                            }}
                            className="w-[8.5rem]"
                        />
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <input
                                type="text"
                                inputMode="search"
                                enterKeyHint="search"
                                placeholder={t('searchProducts')}
                                className="h-full w-full bg-transparent pl-9 pr-[4.75rem] text-sm outline-none placeholder:text-muted-foreground"
                                value={searchValue}
                                onChange={(event) => setSearchValue(event.target.value)}
                            />
                            <div className="absolute inset-y-0 right-1 flex items-center">
                                {searchValue ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearchValue('')}
                                        className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label={t('clearSearch')}
                                    >
                                        <X className="size-4" aria-hidden="true" />
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => setImageOpen(value => !value)}
                                    className={`inline-flex size-9 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                                        imageOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-primary'
                                    }`}
                                    aria-label={t('searchByImage')}
                                    aria-expanded={imageOpen}
                                >
                                    <Camera className="size-4.5" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </form>
                    {imageOpen ? (
                        <VisualSearchQuickUpload className="mt-3 shadow-none" />
                    ) : null}
                    </div>

                    {/* Primary destinations */}
                    <nav className="grid grid-cols-2 gap-2" aria-label={t('menu')}>
                        {[
                            {href: '/search', label: t('shop'), icon: ShoppingBag},
                            {href: '/categories', label: t('categories'), icon: Grid2X2},
                            {href: '/wishlist', label: t('wishlist'), icon: Heart},
                            {href: '/cart', label: t('cart'), icon: ShoppingCart},
                            {href: '/notifications', label: t('notifications'), icon: Bell},
                            {href: '/account/profile', label: t('profile'), icon: User},
                        ].map(item => {
                            const Icon = item.icon;
                            return (
                                <SheetClose
                                    key={item.href}
                                    render={
                                        <Link
                                            href={item.href}
                                            className="mobile-nav-item flex min-h-14 items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-sm font-medium hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                                        />
                                    }
                                    nativeButton={false}
                                    onClick={handleLinkClick}
                                >
                                    <Icon className="size-5 text-primary" aria-hidden="true" />
                                    {item.label}
                                </SheetClose>
                            );
                        })}
                    </nav>

                    {/* Collections */}
                    {collections.length > 0 && (
                        <div>
                            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('categories')}
                            </p>
                            <nav className="flex flex-col gap-0.5">
                                {collections.map((collection) => (
                                    <div key={collection.slug} className="rounded-xl border border-border/70 p-1.5">
                                        <SheetClose
                                            render={
                                                <Link
                                                    href={getCollectionPath(collection.slug)}
                                                    className="mobile-nav-item flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-accent"
                                                />
                                            }
                                            nativeButton={false}
                                            onClick={handleLinkClick}
                                        >
                                            {collection.name}
                                        </SheetClose>
                                        {collection.children?.length ? (
                                            <div className="grid grid-cols-2 gap-0.5 pb-1 pl-3">
                                                {collection.children.map(child => (
                                                    <SheetClose
                                                        key={child.id}
                                                        render={
                                                            <Link
                                                                href={getCollectionPath(child.slug)}
                                                                className="mobile-nav-item flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                                                            />
                                                        }
                                                        nativeButton={false}
                                                        onClick={handleLinkClick}
                                                    >
                                                        {child.name}
                                                    </SheetClose>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </nav>
                        </div>
                    )}

                    {/* Account links */}
                    <div>
                        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('account')}
                        </p>
                        <nav className="flex flex-col gap-0.5">
                            <SheetClose
                                render={
                                    <Link
                                        href="/account/settings"
                                        className="mobile-nav-item flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent"
                                    />
                                }
                                nativeButton={false}
                                onClick={handleLinkClick}
                            >
                                <Settings className="h-5 w-5" />
                                {t('settings')}
                            </SheetClose>
                            <SheetClose
                                render={
                                    <Link
                                        href="/account/orders"
                                        className="mobile-nav-item flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent"
                                    />
                                }
                                nativeButton={false}
                                onClick={handleLinkClick}
                            >
                                <Package className="h-5 w-5" />
                                {t('orders')}
                            </SheetClose>
                            <SheetClose
                                render={
                                    <Link
                                        href="/account/addresses"
                                        className="mobile-nav-item flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent"
                                    />
                                }
                                nativeButton={false}
                                onClick={handleLinkClick}
                            >
                                <MapPin className="h-5 w-5" />
                                {t('addresses')}
                            </SheetClose>
                        </nav>
                    </div>

                    <div>
                        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('settings')}
                        </p>
                        <div className="flex min-h-14 items-center justify-between rounded-xl border border-border bg-background px-3 py-1.5">
                            <span className="text-sm font-medium">{t('toggleTheme')}</span>
                            <ThemeSwitcher />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
