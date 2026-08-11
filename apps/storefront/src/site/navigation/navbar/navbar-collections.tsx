import {getRouteLocale} from '@/platform/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {NavbarLink} from '@/site/navigation/navbar/navbar-link';
import {Link} from '@/platform/i18n/navigation';
import {ArrowRight} from 'lucide-react';
import {getCollectionPath} from '@/features/collections/paths';

export async function NavbarCollections() {
    "use cache";
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`navbar-collections-${locale}`);

    const collections = await getTopCollections(locale);

    return (
        <NavigationMenu>
            <NavigationMenuList>
                {collections.map((collection) => (
                    <NavigationMenuItem key={collection.slug}>
                        {collection.children?.length ? (
                            <>
                                <NavigationMenuTrigger className="bg-transparent">
                                    {collection.name}
                                </NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="w-[32rem] p-3">
                                        <NavigationMenuLink
                                            render={<Link href={getCollectionPath(collection.slug)} />}
                                            className="mb-2 flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3 font-medium"
                                        >
                                            <span>Shop all {collection.name}</span>
                                            <ArrowRight className="size-4" />
                                        </NavigationMenuLink>
                                        <div className="grid grid-cols-2 gap-1">
                                            {collection.children.map(child => (
                                                <NavigationMenuLink
                                                    key={child.id}
                                                    render={<Link href={getCollectionPath(child.slug)} />}
                                                    className="rounded-lg px-4 py-3"
                                                >
                                                    {child.name}
                                                </NavigationMenuLink>
                                            ))}
                                        </div>
                                    </div>
                                </NavigationMenuContent>
                            </>
                        ) : (
                            <NavbarLink href={getCollectionPath(collection.slug)}>
                                {collection.name}
                            </NavbarLink>
                        )}
                    </NavigationMenuItem>
                ))}
            </NavigationMenuList>
        </NavigationMenu>
    );
}
