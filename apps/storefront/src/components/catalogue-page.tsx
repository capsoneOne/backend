import {Fragment, type ReactNode} from 'react';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {getCollectionPath} from '@/features/collections/paths';

export function StorefrontPageShell({children, className}: {children: ReactNode; className?: string}) {
    return (
        <div className={cn('animate-page-enter container mx-auto mt-[4.5rem] px-4 py-12 md:py-16', className)}>
            {children}
        </div>
    );
}

interface StorefrontBreadcrumbsProps {
    items: Array<{label: string; href?: string}>;
}

/** Breadcrumbs are reserved for detail pages that sit below a browse page. */
export function StorefrontBreadcrumbs({items}: StorefrontBreadcrumbsProps) {
    return (
        <Breadcrumb>
            <BreadcrumbList>
                {items.map((item, index) => (
                    <Fragment key={`${item.label}-${index}`}>
                        {index > 0 ? <BreadcrumbSeparator /> : null}
                        <BreadcrumbItem>
                            {item.href ? (
                                <BreadcrumbLink render={<Link href={item.href} />}>{item.label}</BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

interface CataloguePageHeaderProps {
    eyebrow?: string;
    title: ReactNode;
    description?: ReactNode;
    breadcrumbs?: ReactNode;
    actions?: ReactNode;
    variant?: 'display' | 'compact';
}

/** Shared page heading for every product-browsing surface. */
export function CataloguePageHeader({
    eyebrow,
    title,
    description,
    breadcrumbs,
    actions,
    variant = 'display',
}: CataloguePageHeaderProps) {
    return (
        <header className={cn(
            'rounded-xl border border-border bg-secondary/20 px-6',
            variant === 'display'
                ? 'mb-8 py-8 md:mb-10 md:px-9 md:py-10'
                : 'mb-6 py-6 md:mb-8 md:px-8 md:py-7',
        )}>
            {breadcrumbs ? <div className="mb-7">{breadcrumbs}</div> : null}
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div className="max-w-2xl">
                    {eyebrow ? (
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
                    ) : null}
                    <h1 className={cn(
                        'text-balance font-bold tracking-tight',
                        eyebrow && 'mt-3',
                        variant === 'display' ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl',
                    )}>
                        {title}
                    </h1>
                    {description ? (
                        <div className="mt-3 max-w-xl text-base font-light leading-relaxed text-muted-foreground md:text-lg">
                            {description}
                        </div>
                    ) : null}
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
        </header>
    );
}

export const StorefrontPageHeader = CataloguePageHeader;

export function CataloguePageHeaderSkeleton({variant = 'display'}: {variant?: 'display' | 'compact'}) {
    return (
        <div className={cn(
            'rounded-xl border border-border bg-secondary/20 px-6',
            variant === 'display'
                ? 'mb-10 py-8 md:px-9 md:py-10'
                : 'mb-8 py-6 md:px-8 md:py-7',
        )}>
            {variant === 'display' ? <div className="h-3 w-24 animate-pulse rounded bg-muted" /> : null}
            <div className={cn(
                'w-72 animate-pulse rounded-lg bg-muted',
                variant === 'display' ? 'mt-4 h-12' : 'h-10',
            )} />
            {variant === 'display' ? <div className="mt-4 h-5 w-full max-w-lg animate-pulse rounded bg-muted" /> : null}
        </div>
    );
}

export interface CatalogueCategory {
    id: string;
    name: string;
    slug: string;
    productVariants?: {totalItems: number} | null;
    children?: CatalogueCategory[] | null;
}

interface CatalogueSidebarProps {
    categories: CatalogueCategory[];
    activeSlug?: string;
    categoryTitle: string;
    allProductsLabel: string;
    filters: ReactNode;
}

/**
 * Shared catalogue navigation. Categories stay visible on desktop; the passed
 * filter control supplies its own compact mobile drawer.
 */
export function CatalogueSidebar({
    categories,
    activeSlug,
    categoryTitle,
    allProductsLabel,
    filters,
}: CatalogueSidebarProps) {
    const itemClass = (active: boolean) => cn(
        'flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        active
            ? 'bg-primary/10 font-semibold text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

    return (
        <aside className="empty:hidden max-lg:sticky max-lg:top-16 max-lg:z-30 max-lg:-mx-1 max-lg:bg-background/95 max-lg:px-1 max-lg:py-2 max-lg:backdrop-blur-xl lg:w-60 lg:shrink-0">
            <nav className="mb-6 hidden border-b border-border pb-6 lg:block" aria-label={categoryTitle}>
                <h2 className="mb-3 text-lg font-semibold">{categoryTitle}</h2>
                <div className="space-y-1">
                    <Link href="/search" className={itemClass(!activeSlug)}>
                        <span>{allProductsLabel}</span>
                    </Link>
                    {categories.map(category => (
                        <div key={category.id}>
                            <Link href={getCollectionPath(category.slug)} className={itemClass(activeSlug === category.slug)}>
                                <span>{category.name}</span>
                                {category.productVariants ? (
                                    <span className="text-xs tabular-nums opacity-70">{category.productVariants.totalItems}</span>
                                ) : null}
                            </Link>
                            {category.children?.length ? (
                                <div className="ml-3 border-l border-border pl-2">
                                    {category.children.map(child => (
                                        <Link
                                            key={child.id}
                                            href={getCollectionPath(child.slug)}
                                            className={itemClass(activeSlug === child.slug)}
                                        >
                                            <span>{child.name}</span>
                                            {child.productVariants ? (
                                                <span className="text-xs tabular-nums opacity-70">{child.productVariants.totalItems}</span>
                                            ) : null}
                                        </Link>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </nav>
            {filters}
        </aside>
    );
}
