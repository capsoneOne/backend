import {NavigationLink} from '@/site/navigation/navigation-link';
import {NavbarCollections} from '@/site/navigation/navbar/navbar-collections';
import {NavbarCart} from '@/site/navigation/navbar/navbar-cart';
import {NavbarUser} from '@/site/navigation/navbar/navbar-user';
import {LanguagePicker} from '@/site/navigation/navbar/language-picker';
import {CurrencyPickerWrapper} from '@/site/navigation/navbar/currency-picker-wrapper';
import {MobileNavWrapper} from '@/site/navigation/navbar/mobile-nav-wrapper';
import {Suspense} from "react";
import {SearchInputWrapper} from '@/site/navigation/search-input-wrapper';
import {SearchLink} from '@/site/navigation/search-link';
import {WishlistLink} from '@/site/navigation/wishlist-link';
import {NotificationsLink} from '@/site/navigation/notifications-link';
import {NavbarUserSkeleton} from '@/site/navigation/skeletons/navbar-user-skeleton';
import {SearchInputSkeleton} from '@/site/navigation/skeletons/search-input-skeleton';
import {Brand} from '@/site/brand';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {PrimaryNavLink} from '@/site/navigation/primary-nav-link';

/**
 * Three-zone header: identity, a centred search field, and actions.
 *
 * Shop and Categories are product navigation. Search owns discovery; wishlist
 * items, notifications, cart, and profile are compact utilities.
 */
export async function Navbar() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Navigation'});

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/80 shadow-[0_8px_30px_-28px_color-mix(in_oklch,var(--color-primary)_60%,transparent)] backdrop-blur-xl">
            <div className="container mx-auto px-4">
                <div className="flex h-[4.5rem] items-center gap-4">
                    <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-6">
                        <Suspense>
                            <MobileNavWrapper />
                        </Suspense>
                        <NavigationLink
                            href="/"
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                        >
                            <Brand className="max-w-[11rem] md:max-w-none" />
                        </NavigationLink>
                        <nav className="hidden items-center gap-1 lg:flex">
                            <Suspense fallback={(
                                <NavigationLink
                                    href="/search"
                                    className="inline-flex h-9 items-center rounded-md px-4 py-2 text-sm font-medium"
                                >
                                    {t('shop')}
                                </NavigationLink>
                            )}>
                                <PrimaryNavLink href="/search">{t('shop')}</PrimaryNavLink>
                            </Suspense>
                            <Suspense>
                                <NavbarCollections/>
                            </Suspense>
                        </nav>
                    </div>

                    <div className="hidden flex-1 justify-center px-2 lg:flex">
                        <Suspense fallback={<SearchInputSkeleton />}>
                            <SearchInputWrapper/>
                        </Suspense>
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
                        <Suspense>
                            <SearchLink />
                        </Suspense>
                        <span className="mx-1 hidden h-5 w-px bg-border lg:block" />
                        <span className="hidden sm:inline-flex">
                            <Suspense><WishlistLink /></Suspense>
                        </span>
                        <Suspense>
                            <NotificationsLink className="hidden md:inline-flex" />
                        </Suspense>
                        <Suspense>
                            <NavbarCart/>
                        </Suspense>
                        <span className="hidden sm:inline-flex">
                            <Suspense fallback={<NavbarUserSkeleton />}>
                                <NavbarUser/>
                            </Suspense>
                        </span>
                        <span className="inline-flex">
                            <Suspense><LanguagePicker /></Suspense>
                        </span>
                        <span className="hidden min-[1700px]:inline-flex">
                            <Suspense><CurrencyPickerWrapper /></Suspense>
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}
