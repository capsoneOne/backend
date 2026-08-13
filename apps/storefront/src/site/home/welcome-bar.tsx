import {getTranslations} from 'next-intl/server';

import {getAvatarSrc} from '@/features/account/avatars';
import {getActiveCustomer} from '@/features/account/customer';
import {getRouteLocale} from '@/platform/i18n/server';
import {PersonalizedWelcome} from '@/site/home/personalized-welcome';

export async function WelcomeBar() {
    const locale = await getRouteLocale();
    const [customer, t] = await Promise.all([
        getActiveCustomer(),
        getTranslations({locale, namespace: 'Home'}),
    ]);

    if (!customer) return null;

    const name = customer.firstName.trim() || customer.lastName.trim();
    const initials = `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase();

    return (
        <PersonalizedWelcome
            avatarSrc={getAvatarSrc(customer.customFields?.avatarKey)}
            initials={initials}
            greetings={{
                fallback: t('welcome.fallback', {name}),
                morning: t('welcome.morning', {name}),
                afternoon: t('welcome.afternoon', {name}),
                evening: t('welcome.evening', {name}),
            }}
            message={t('welcome.message')}
            action={t('welcome.action')}
        />
    );
}
