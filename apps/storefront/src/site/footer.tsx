import {getRouteLocale} from '@/platform/i18n/server';
import {SITE_NAME} from '@/config/metadata';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import Image from "next/image";
import {NavigationLink} from '@/site/navigation/navigation-link';
import {Brand} from '@/site/brand';
import {getTranslations} from 'next-intl/server';

const COPYRIGHT_YEAR = 2026;

const linkClass = 'font-light text-muted-foreground transition-colors hover:text-foreground';
const headingClass = 'text-xs font-medium uppercase tracking-[0.14em] text-foreground';

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
        <footer className="mt-auto border-t border-border bg-muted/30">
            <div className="container mx-auto px-4 py-16">
                <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
                    <div className="max-w-sm">
                        <NavigationLink href="/" className="inline-block">
                            <Brand responsive={false} />
                        </NavigationLink>
                        <p className="mt-5 text-balance font-light leading-relaxed text-muted-foreground">
                            {t('description')}
                        </p>
                    </div>

                    <div>
                        <p className={headingClass}>{t('categories')}</p>
                        <ul className="mt-5 space-y-3">
                            {collections.map((collection) => (
                                <li key={collection.id}>
                                    <NavigationLink href={`/collection/${collection.slug}`} className={linkClass}>
                                        {collection.name}
                                    </NavigationLink>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className={headingClass}>{t('customer')}</p>
                        <ul className="mt-5 space-y-3">
                            <li>
                                <NavigationLink href="/search" className={linkClass}>{t('shopAll')}</NavigationLink>
                            </li>
                            <li>
                                <NavigationLink href="/account/orders" className={linkClass}>{t('orders')}</NavigationLink>
                            </li>
                            <li>
                                <NavigationLink href="/account/profile" className={linkClass}>{t('account')}</NavigationLink>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <p className={headingClass}>{t('vendure')}</p>
                        <ul className="mt-5 space-y-3">
                            <li>
                                <a href="https://github.com/vendure-ecommerce" target="_blank" rel="noopener noreferrer" className={linkClass}>
                                    {t('github')}
                                </a>
                            </li>
                            <li>
                                <a href="https://docs.vendure.io" target="_blank" rel="noopener noreferrer" className={linkClass}>
                                    {t('documentation')}
                                </a>
                            </li>
                            <li>
                                <a href="https://github.com/vendure-ecommerce/vendure" target="_blank" rel="noopener noreferrer" className={linkClass}>
                                    {t('sourceCode')}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm font-light text-muted-foreground md:flex-row">
                    <Copyright/>
                    <div className="flex items-center gap-2">
                        <span>{t('poweredBy')}</span>
                        <a href="https://vendure.io" target="_blank" rel="noopener noreferrer" className="opacity-70 transition-opacity hover:opacity-100">
                            <Image src="/vendure.svg" alt="Vendure" width={40} height={27} className="h-4 w-auto dark:invert" />
                        </a>
                        <span aria-hidden="true">&amp;</span>
                        <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="opacity-70 transition-opacity hover:opacity-100">
                            <Image src="/next.svg" alt="Next.js" width={16} height={16} className="h-4 w-auto dark:invert" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
