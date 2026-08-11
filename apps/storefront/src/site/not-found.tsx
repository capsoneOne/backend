import { getRouteLocale } from '@/platform/i18n/server';
import { Button } from '@/components/ui/button';
import { Home, ShoppingBag } from 'lucide-react';
import { Link } from '@/platform/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import {getTopCollections} from '@/features/collections/data';
import {getCollectionPath} from '@/features/collections/paths';
import {StorefrontPageHeader, StorefrontPageShell} from '@/components/catalogue-page';

export default async function NotFound() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'NotFound'});
    let collections: { id: string; name: string; slug: string }[] = [];
    try {
        collections = await getTopCollections(locale);
    } catch {
        // Gracefully handle if collections can't be fetched
    }

    return (
        <StorefrontPageShell className="max-w-3xl">
            <StorefrontPageHeader
                eyebrow="404"
                title={t('title')}
                description={t('message')}
                actions={(
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button nativeButton={false} render={<Link href="/" />} size="lg" className="rounded-lg">
                            <Home className="mr-2 size-4" aria-hidden="true" />
                            {t('goHome')}
                        </Button>
                        <Button nativeButton={false} render={<Link href="/search" />} variant="outline" size="lg" className="rounded-lg bg-background">
                            <ShoppingBag className="mr-2 size-4" aria-hidden="true" />
                            {t('browseProducts')}
                        </Button>
                    </div>
                )}
            />

            {collections.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6">
                    <p className="mb-3 text-sm font-medium text-muted-foreground">{t('popularCollections')}</p>
                    <div className="flex flex-wrap gap-2">
                        {collections.slice(0, 6).map((collection) => (
                            <Button
                                key={collection.id}
                                render={<Link href={getCollectionPath(collection.slug)} />}
                                nativeButton={false}
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                            >
                                {collection.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </StorefrontPageShell>
    );
}
