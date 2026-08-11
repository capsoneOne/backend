'use client';

import {ArrowRight} from 'lucide-react';
import {getCollectionPath} from '@/features/collections/paths';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {cn} from '@/lib/utils';
import {Link, usePathname} from '@/platform/i18n/navigation';
import {navbarActiveClass, navbarPrimaryClass} from '@/site/navigation/navigation-styles';

interface CollectionItem {
    id: string;
    name: string;
    slug: string;
    children?: Array<{id: string; name: string; slug: string}> | null;
}

export function NavbarCollectionsMenu({
    collections,
    categoriesLabel,
    viewAllLabel,
}: {
    collections: CollectionItem[];
    categoriesLabel: string;
    viewAllLabel: string;
}) {
    const pathname = usePathname();
    const active = pathname === '/categories' || pathname === '/featured' || pathname.startsWith('/collection/');

    return (
        <NavigationMenu className="z-50">
            <NavigationMenuList>
                <NavigationMenuItem>
                    <NavigationMenuTrigger className={cn(navbarPrimaryClass, 'bg-transparent', active && navbarActiveClass)}>
                        {categoriesLabel}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <div className="w-[34rem] p-3">
                            <NavigationMenuLink
                                render={<Link href="/categories" />}
                                className="mb-2 flex items-center justify-between rounded-lg bg-primary/8 px-4 py-3 font-medium text-primary"
                            >
                                <span>{viewAllLabel}</span>
                                <ArrowRight className="size-4" />
                            </NavigationMenuLink>
                            <div className="grid grid-cols-2 gap-2">
                                {collections.map(collection => (
                                    <div key={collection.id} className="rounded-lg border border-border/70 p-1.5">
                                        <NavigationMenuLink
                                            render={<Link href={getCollectionPath(collection.slug)} />}
                                            className="flex min-h-10 items-center justify-between rounded-md px-3 py-2 font-medium"
                                        >
                                            <span>{collection.name}</span>
                                            <ArrowRight className="size-3.5 text-muted-foreground" />
                                        </NavigationMenuLink>
                                        {collection.children?.length ? (
                                            <div>
                                                {collection.children.slice(0, 5).map(child => (
                                                    <NavigationMenuLink
                                                        key={child.id}
                                                        render={<Link href={getCollectionPath(child.slug)} />}
                                                        className="rounded-md px-3 py-2 text-sm text-muted-foreground"
                                                    >
                                                        {child.name}
                                                    </NavigationMenuLink>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </NavigationMenuContent>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    );
}
