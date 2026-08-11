import {Camera} from 'lucide-react';
import {getTranslations} from 'next-intl/server';
import {NavigationLink} from '@/site/navigation/navigation-link';

/**
 * Entry point for image search, placed beside the text search box — the same
 * affordance users know from Google Lens. Without this the /visual-search route
 * is only reachable by typing the URL.
 */
export async function VisualSearchLink() {
    const t = await getTranslations('Navigation');
    return (
        <NavigationLink
            href="/visual-search"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('searchByImage')}
        >
            <Camera className="size-5" />
            <span className="sr-only">{t('searchByImage')}</span>
        </NavigationLink>
    );
}
