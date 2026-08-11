import Image from 'next/image';
import {ArrowRight} from 'lucide-react';
import {getTranslations} from 'next-intl/server';

import {getAllCollections} from '@/features/collections/data';
import {getCollectionPath} from '@/features/collections/paths';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';

export async function ShopByCategory() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});
    const collections = await getAllCollections(locale);

    if (collections.length === 0) return null;

    return (
        <section className="reveal-section border-b border-border py-16 md:py-24">
            <div className="container mx-auto px-4">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                            {t('categoriesEyebrow')}
                        </p>
                        <h2 className="mt-3 text-3xl font-bold md:text-4xl">{t('shopByCategory')}</h2>
                        <p className="mt-3 max-w-xl font-light text-muted-foreground">
                            {t('shopByCategoryDescription')}
                        </p>
                    </div>
                    <Link
                        href="/categories"
                        className="hidden items-center gap-2 text-sm font-medium text-primary hover:underline md:flex"
                    >
                        {t('viewAllCategories')}
                        <ArrowRight className="size-4" />
                    </Link>
                </div>

                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {collections.slice(0, 6).map((collection, index) => (
                        <Link
                            key={collection.id}
                            href={getCollectionPath(collection.slug)}
                            className="group relative min-h-72 overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                        >
                            {collection.featuredAsset ? (
                                <Image
                                    src={collection.featuredAsset.preview}
                                    alt={collection.name}
                                    fill
                                    priority={index < 3}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-dotfield opacity-70" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-2xl font-semibold">{collection.name}</h3>
                                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
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

                <Link
                    href="/categories"
                    className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline md:hidden"
                >
                    {t('viewAllCategories')}
                    <ArrowRight className="size-4" />
                </Link>
            </div>
        </section>
    );
}
