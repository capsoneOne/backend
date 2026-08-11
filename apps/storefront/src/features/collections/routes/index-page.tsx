import type {Metadata} from 'next';
import Image from 'next/image';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {getAllCollections} from '@/features/collections/data';
import {SITE_NAME, buildCanonicalUrl} from '@/config/metadata';
import {toOgLocale} from '@/platform/i18n/locale-utils';
import {ArrowRight} from 'lucide-react';
import {StorefrontPageHeader, StorefrontPageShell} from '@/components/catalogue-page';
import {getCollectionPath} from '@/features/collections/paths';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Collection'});

    return {
        title: t('indexTitle'),
        description: t('indexDescription', {siteName: SITE_NAME}),
        alternates: {canonical: buildCanonicalUrl('/collections')},
        openGraph: {
            title: `${t('indexTitle')} | ${SITE_NAME}`,
            description: t('indexDescription', {siteName: SITE_NAME}),
            type: 'website',
            locale: toOgLocale(locale),
            url: buildCanonicalUrl('/collections'),
        },
    };
}

/**
 * The index the storefront never had.
 *
 * Collections were previously reachable only from the navbar dropdown and the
 * footer, which means they were invisible to anyone arriving on a product page
 * and unlinkable from a campaign.
 */
export default async function CollectionsIndexPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Collection'});
    const collections = await getAllCollections(locale);

    return (
        <StorefrontPageShell>
            <StorefrontPageHeader
                eyebrow={t('indexEyebrow')}
                title={t('indexTitle')}
                description={t('indexSubtitle')}
            />

            {collections.length === 0 ? (
                <p className="mt-16 text-center font-light text-muted-foreground">
                    {t('indexEmpty')}
                </p>
            ) : (
                <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                    {collections.map((collection, index) => (
                        <Link
                            key={collection.id}
                            href={getCollectionPath(collection.slug)}
                            className="group flex flex-col rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                        >
                            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                                {collection.featuredAsset ? (
                                    <Image
                                        src={collection.featuredAsset.preview}
                                        alt={collection.name}
                                        fill
                                        priority={index < 3}
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm font-light text-muted-foreground">
                                        {collection.name}
                                    </div>
                                )}
                                <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-foreground/[0.06]" />
                            </div>

                            <div className="flex items-baseline justify-between gap-3 px-1 pt-4">
                                <h2 className="text-lg font-medium transition-colors group-hover:text-primary">
                                    {collection.name}
                                </h2>
                                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                            </div>
                            <p className="px-1 pt-1 text-sm font-light text-muted-foreground">
                                {t('productCount', {count: collection.productVariants.totalItems})}
                            </p>
                            {collection.children?.length ? (
                                <div className="mt-3 flex flex-wrap gap-2 px-1">
                                    {collection.children.slice(0, 6).map(child => (
                                        <span
                                            key={child.id}
                                            className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-foreground"
                                        >
                                            {child.name}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </Link>
                    ))}
                </div>
            )}
        </StorefrontPageShell>
    );
}
