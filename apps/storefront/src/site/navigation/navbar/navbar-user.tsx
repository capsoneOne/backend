import {getRouteLocale} from '@/platform/i18n/server';
import {getActiveCustomer} from '@/features/account/customer';
import {getTranslations} from 'next-intl/server';
import {NavbarAccountMenu} from '@/site/navigation/navbar/navbar-account-menu';

export async function NavbarUser() {
    const locale = await getRouteLocale();
    const [t, tAuth, customer] = await Promise.all([
        getTranslations({locale, namespace: 'Navigation'}),
        getTranslations({locale, namespace: 'Auth'}),
        getActiveCustomer(),
    ]);

    return (
        <NavbarAccountMenu
            customer={customer ? {
                firstName: customer.firstName,
                lastName: customer.lastName,
                emailAddress: customer.emailAddress,
            } : null}
            labels={{
                profile: t('profile'),
                account: t('account'),
                orders: t('orders'),
                addresses: t('addresses'),
                settings: t('settings'),
                signIn: t('signIn'),
                createAccount: tAuth('createAccount'),
            }}
        />
    );
}
