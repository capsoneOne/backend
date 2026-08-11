'use client';

import {useState} from 'react';
import { Link, useRouter } from '@/platform/i18n/navigation';
import {Menu, Search, ShoppingBag, User, Package, MapPin, Camera} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
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
    const [imageOpen, setImageOpen] = useState(false);
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchValue.trim()) return;
        router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
        setImageOpen(false);
        setOpen(false);
    };

    const handleLinkClick = () => {
        setOpen(false);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="size-11 md:hidden" />}>
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
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('searchProducts')}
                            className="h-11 w-full pl-9 pr-11"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setImageOpen(value => !value)}
                            className={`absolute right-0 top-0 inline-flex size-11 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                                imageOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-primary'
                            }`}
                            aria-label={t('searchByImage')}
                            aria-expanded={imageOpen}
                        >
                            <Camera className="size-4.5" aria-hidden="true" />
                        </button>
                    </form>
                    {imageOpen ? (
                        <VisualSearchQuickUpload className="mt-3 shadow-none" />
                    ) : null}
                    </div>

                    {/* Shop All */}
                    <div>
                        <SheetClose
                            render={
                                <Link
                                    href="/search"
                                    className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                                />
                            }
                            nativeButton={false}
                            onClick={handleLinkClick}
                        >
                            <ShoppingBag className="h-5 w-5" />
                            {t('shopAll')}
                        </SheetClose>
                    </div>

                    {/* Collections */}
                    {collections.length > 0 && (
                        <div>
                            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('collections')}
                            </p>
                            <nav className="flex flex-col gap-0.5">
                                {collections.map((collection) => (
                                    <div key={collection.slug} className="rounded-xl border border-border/70 p-1.5">
                                        <SheetClose
                                            render={
                                                <Link
                                                    href={getCollectionPath(collection.slug)}
                                                    className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-accent"
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
                                                                className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
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
                                        href="/account/profile"
                                        className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                                    />
                                }
                                nativeButton={false}
                                onClick={handleLinkClick}
                            >
                                <User className="h-5 w-5" />
                                {t('profile')}
                            </SheetClose>
                            <SheetClose
                                render={
                                    <Link
                                        href="/account/orders"
                                        className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
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
                                        className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
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
                </div>
            </SheetContent>
        </Sheet>
    );
}
