import Image from 'next/image';
import {ArrowRight} from 'lucide-react';
import {getTranslations} from 'next-intl/server';

import {getAllCollections} from '@/features/collections/data';
import {getCollectionPath} from '@/features/collections/paths';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {cn} from '@/lib/utils';
import {
    StorefrontSectionHeader,
    StorefrontSectionLink,
    storefrontSectionClass,
} from '@/components/storefront-section';

export async function ShopByCategory() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});
    const collections = await getAllCollections(locale);

    if (collections.length === 0) return null;

    return (
        <section className={`reveal-section ${storefrontSectionClass}`}>
            <div className="container mx-auto px-4">
                <StorefrontSectionHeader
                    eyebrow={t('categoriesEyebrow')}
                    title={t('shopByCategory')}
                    description={t('shopByCategoryDescription')}
                    href="/categories"
                    linkLabel={t('viewAllCategories')}
                />

                <div className="mt-10 grid auto-rows-[15rem] gap-4 sm:grid-cols-2 lg:grid-cols-12">
                    {collections.slice(0, 6).map((collection, index) => (
                        <Link
                            key={collection.id}
                            href={getCollectionPath(collection.slug)}
                            className={cn(
                                'group interactive-lift relative overflow-hidden rounded-2xl border border-transparent bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4',
                                index === 0 && 'sm:row-span-2 lg:col-span-7',
                                index === 1 && 'lg:col-span-5',
                                index === 2 && 'lg:col-span-5',
                                index >= 3 && 'lg:col-span-4',
                            )}
                        >
                            {collection.featuredAsset ? (
                                <Image
                                    src={collection.featuredAsset.preview}
                                    alt={collection.name}
                                    fill
                                    priority={index < 3}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-dotfield opacity-70" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent transition-colors duration-500 group-hover:from-primary/90" />
                            <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-6">
                                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-white/65">
                                    {String(index + 1).padStart(2, '0')}
                                </p>
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className={cn('font-bold', index === 0 ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl')}>{collection.name}</h3>
                                    <span className="flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-all duration-300 group-hover:translate-x-1 group-hover:bg-white group-hover:text-primary">
                                        <ArrowRight className="size-5" />
                                    </span>
                                </div>
                                {collection.children?.length ? (
                                    <p className="mt-2 line-clamp-1 text-sm text-white/75">
                                        {collection.children.slice(0, 3).map(child => child.name).join(' · ')}
                                    </p>
                                ) : null}
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-8 flex justify-center md:hidden">
                    <StorefrontSectionLink href="/categories">{t('viewAllCategories')}</StorefrontSectionLink>
                </div>
            </div>
        </section>
    );
}
