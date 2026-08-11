import {Search} from 'lucide-react';
import {getTranslations} from 'next-intl/server';
import {NavigationLink} from '@/site/navigation/navigation-link';

/**
 * Compact text-search entry point for viewports too narrow for the full input.
 *
 * Below `lg` the search box used to disappear entirely — the only way to search
 * was to open the hamburger drawer first, which buries the storefront's primary
 * action behind a menu on every phone and most tablets.
 */
export async function SearchLink() {
    const t = await getTranslations('Navigation');
    return (
        <NavigationLink
            href="/search"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
            title={t('searchProducts')}
        >
            <Search className="size-5" />
            <span className="sr-only">{t('searchProducts')}</span>
        </NavigationLink>
    );
}
