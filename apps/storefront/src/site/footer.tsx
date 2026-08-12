import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME} from '@/config/metadata';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import {getCollectionPath} from '@/features/collections/paths';
import {Heart, RotateCcw, ShieldCheck, Truck} from 'lucide-react';
import {NavigationLink} from '@/site/navigation/navigation-link';
import {Brand} from '@/site/brand';
import {getTranslations} from 'next-intl/server';
import {PaymentMethodMarks} from '@/site/payment-method-marks';

const COPYRIGHT_YEAR = 2026;

const linkClass = 'group inline-flex min-h-10 min-w-11 items-center font-light text-muted-foreground transition-[color,transform] duration-200 hover:translate-x-0.5 hover:text-primary focus-visible:text-primary focus-visible:outline-none';
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
        <footer className="relative mt-auto overflow-hidden border-t border-border bg-background">
            <div aria-hidden="true" className="absolute -bottom-48 -left-24 size-96 rounded-full bg-primary/8 blur-3xl" />
            <div aria-hidden="true" className="absolute -right-32 top-40 size-80 rounded-full bg-cyan-400/5 blur-3xl" />
            <div className="relative border-b border-border bg-secondary/25">
                <div className="container mx-auto grid px-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-3 border-border py-5 sm:border-r sm:pr-6">
                        <Truck className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-bold">{t('deliveryTitle')}</p>
                            <p className="mt-0.5 text-xs font-light text-muted-foreground">{t('deliveryDescription')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 border-t border-border py-5 sm:border-t-0 sm:pl-6 lg:border-r lg:pr-6">
                        <RotateCcw className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-bold">{t('returnsTitle')}</p>
                            <p className="mt-0.5 text-xs font-light text-muted-foreground">{t('returnsDescription')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 border-t border-border py-5 sm:border-r sm:pr-6 lg:border-t-0 lg:pl-6">
                        <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-bold">{t('secureTitle')}</p>
                            <p className="mt-0.5 text-xs font-light text-muted-foreground">{t('secureDescription')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 border-t border-border py-5 sm:pl-6 lg:border-t-0">
                        <Heart className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-bold">{t('wishlistTitle')}</p>
                            <p className="mt-0.5 text-xs font-light text-muted-foreground">{t('wishlistDescription')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative container mx-auto px-4 pb-8 pt-12 lg:pt-14">
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
                        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-2 text-xs font-medium text-primary">
                            <ShieldCheck className="size-3.5" aria-hidden="true" />
                            {t('shopConfidence')}
                        </div>
                    </div>

                    <div>
                        <p className={headingClass}>{t('categories')}</p>
                        <ul className="mt-4">
                            <li><NavigationLink href="/categories" className={linkClass}>{t('allCollections')}</NavigationLink></li>
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
                            <li><NavigationLink href="/notifications" className={linkClass}>{t('notifications')}</NavigationLink></li>
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

                <div className="mt-10">
                    <PaymentMethodMarks
                        title={t('paymentsTitle')}
                        description={t('paymentsDescription')}
                        demoNote={t('paymentsDemoNote')}
                    />
                </div>

                <div className="mt-8 flex flex-col gap-2 border-t border-border pt-7 text-sm font-light text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <Copyright/>
                    <p>{t('closingLine')}</p>
                </div>
            </div>
        </footer>
    );
}
