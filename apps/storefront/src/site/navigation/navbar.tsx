import {NavigationLink} from '@/site/navigation/navigation-link';
import {NavbarCollections} from '@/site/navigation/navbar/navbar-collections';
import {NavbarCart} from '@/site/navigation/navbar/navbar-cart';
import {NavbarUser} from '@/site/navigation/navbar/navbar-user';
import {ThemeSwitcher} from '@/site/navigation/navbar/theme-switcher';
import {LanguagePicker} from '@/site/navigation/navbar/language-picker';
import {CurrencyPickerWrapper} from '@/site/navigation/navbar/currency-picker-wrapper';
import {MobileNavWrapper} from '@/site/navigation/navbar/mobile-nav-wrapper';
import {Suspense} from "react";
import {SearchInput} from '@/site/navigation/search-input';
import {VisualSearchLink} from '@/site/navigation/visual-search-link';
import {SearchLink} from '@/site/navigation/search-link';
import {NavbarUserSkeleton} from '@/site/navigation/skeletons/navbar-user-skeleton';
import {SearchInputSkeleton} from '@/site/navigation/skeletons/search-input-skeleton';
import {Brand} from '@/site/brand';

/**
 * Three-zone header: identity, a centred search field, and actions.
 *
 * The search input is centred rather than crowded against the action icons
 * because it is the primary control on a search-led storefront — the layout
 * should say that before any copy does.
 */
export function Navbar() {
    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/75 backdrop-blur-xl">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center gap-4">
                    <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-6">
                        <Suspense>
                            <MobileNavWrapper />
                        </Suspense>
                        <NavigationLink
                            href="/"
                            className="rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                        >
                            <Brand className="max-w-[11rem] md:max-w-none" />
                        </NavigationLink>
                        <nav className="hidden items-center gap-1 lg:flex">
                            <Suspense>
                                <NavbarCollections/>
                            </Suspense>
                        </nav>
                    </div>

                    <div className="hidden flex-1 justify-center px-2 lg:flex">
                        <Suspense fallback={<SearchInputSkeleton />}>
                            <SearchInput/>
                        </Suspense>
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
                        <Suspense>
                            <SearchLink />
                        </Suspense>
                        <Suspense>
                            <VisualSearchLink />
                        </Suspense>
                        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
                        <Suspense>
                            <LanguagePicker />
                        </Suspense>
                        <Suspense>
                            <CurrencyPickerWrapper />
                        </Suspense>
                        <Suspense>
                            <ThemeSwitcher />
                        </Suspense>
                        <Suspense>
                            <NavbarCart/>
                        </Suspense>
                        <Suspense fallback={<NavbarUserSkeleton />}>
                            <NavbarUser/>
                        </Suspense>
                    </div>
                </div>
            </div>
        </header>
    );
}
