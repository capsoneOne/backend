import type {Metadata} from 'next';
import {Suspense} from 'react';
import {noIndexRobots} from '@/config/metadata';
import {AccountNavLinks} from '@/features/account/components/account-nav-links';
import {StorefrontPageShell} from '@/components/catalogue-page';

export const metadata: Metadata = {
    robots: noIndexRobots(),
};

const navItems = [
    {href: '/account/orders', labelKey: 'orders', icon: 'Package'},
    {href: '/account/addresses', labelKey: 'addresses', icon: 'MapPin'},
    {href: '/account/profile', labelKey: 'profile', icon: 'User'},
    {href: '/account/settings', labelKey: 'settings', icon: 'Settings'},
];

export default async function AccountLayout({children}: LayoutProps<'/[locale]/account'>) {
    return (
        <StorefrontPageShell>
            {/* Mobile: horizontal tab bar */}
            <div className="md:hidden mb-6">
                <Suspense>
                    <AccountNavLinks items={navItems} layout="horizontal" />
                </Suspense>
            </div>

            <div className="flex gap-8">
                {/* Desktop: sidebar */}
                <aside className="hidden md:block w-64 shrink-0">
                    <Suspense>
                        <AccountNavLinks items={navItems} layout="vertical" />
                    </Suspense>
                </aside>
                <main className="flex-1 min-w-0">
                    {children}
                </main>
            </div>
        </StorefrontPageShell>
    );
}
