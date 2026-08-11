import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME} from '@/config/metadata';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import {getCollectionPath} from '@/features/collections/paths';
import {Heart, RotateCcw, Truck} from 'lucide-react';
import {NavigationLink} from '@/site/navigation/navigation-link';
import {Brand} from '@/site/brand';
import {getTranslations} from 'next-intl/server';

const COPYRIGHT_YEAR = 2026;

const linkClass = 'inline-flex min-h-10 min-w-11 items-center font-light text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary';
const headingClass = 'text-xs font-bold uppercase tracking-[0.16em] text-foreground';

async function Copyright() {
    'use cache'
    cacheLife('days');

    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Footer'});

    return (
        <div>
            &copy; {COPYRIGHT_YEAR} {t('copyright', {siteName: SITE_NAME})}
        </div>
    )
}

export async function Footer() {
    'use cache'
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`footer-${locale}`);

    const t = await getTranslations({locale, namespace: 'Footer'});
    const collections = await getTopCollections(locale);

    return (
        <footer className="mt-auto border-t border-border bg-background">
            <div className="border-b border-border bg-secondary/25">
                <div className="container mx-auto grid px-4 sm:grid-cols-3">
                    <div className="flex items-center gap-3 border-border py-5 sm:border-r sm:pr-6">
                        <Truck className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-bold">{t('deliveryTitle')}</p>
                            <p className="mt-0.5 text-xs font-light text-muted-foreground">{t('deliveryDescription')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 border-t border-border py-5 sm:border-r sm:border-t-0 sm:px-6">
                        <RotateCcw className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-bold">{t('returnsTitle')}</p>
                            <p className="mt-0.5 text-xs font-light text-muted-foreground">{t('returnsDescription')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 border-t border-border py-5 sm:border-t-0 sm:pl-6">
                        <Heart className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-bold">{t('wishlistTitle')}</p>
                            <p className="mt-0.5 text-xs font-light text-muted-foreground">{t('wishlistDescription')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pb-8 pt-12 lg:pt-14">
                <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
                    <div className="max-w-sm sm:col-span-2 lg:col-span-1">
                        <NavigationLink href="/" className="inline-flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background">
                            <Brand responsive={false} />
                        </NavigationLink>
                        <p className="mt-5 max-w-xs text-pretty font-light leading-relaxed text-muted-foreground">
                            {t('description')}
                        </p>
                        <p className="mt-5 text-xs font-medium text-primary">
                            {t('storeTagline')}
                        </p>
                    </div>

                    <div>
                        <p className={headingClass}>{t('categories')}</p>
                        <ul className="mt-4">
                            <li><NavigationLink href="/collections" className={linkClass}>{t('allCollections')}</NavigationLink></li>
                            {collections.slice(0, 4).map((collection) => (
                                <li key={collection.id}>
                                    <NavigationLink href={getCollectionPath(collection.slug)} className={linkClass}>
                                        {collection.name}
                                    </NavigationLink>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className={headingClass}>{t('shop')}</p>
                        <ul className="mt-4">
                            <li><NavigationLink href="/search" className={linkClass}>{t('shopAll')}</NavigationLink></li>
                            <li><NavigationLink href="/wishlist" className={linkClass}>{t('savedItems')}</NavigationLink></li>
                            <li><NavigationLink href="/account/orders" className={linkClass}>{t('orders')}</NavigationLink></li>
                            <li><NavigationLink href="/account/profile" className={linkClass}>{t('account')}</NavigationLink></li>
                        </ul>
                    </div>

                    <div>
                        <p className={headingClass}>{t('company')}</p>
                        <ul className="mt-4">
                            <li><NavigationLink href="/about" className={linkClass}>{t('about')}</NavigationLink></li>
                            <li><NavigationLink href="/contact" className={linkClass}>{t('contact')}</NavigationLink></li>
                        </ul>
                    </div>

                    <div>
                        <p className={headingClass}>{t('support')}</p>
                        <ul className="mt-4">
                            <li><NavigationLink href="/help" className={linkClass}>{t('help')}</NavigationLink></li>
                            <li><NavigationLink href="/shipping-returns" className={linkClass}>{t('shippingReturns')}</NavigationLink></li>
                            <li>
                                <NavigationLink href="/privacy" className={linkClass}>{t('privacy')}</NavigationLink>
                            </li>
                            <li><NavigationLink href="/terms" className={linkClass}>{t('terms')}</NavigationLink></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 flex flex-col gap-2 border-t border-border pt-7 text-sm font-light text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <Copyright/>
                    <p>{t('closingLine')}</p>
                </div>
            </div>
        </footer>
    );
}
