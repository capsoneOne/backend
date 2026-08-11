import type {Metadata} from 'next';
import {getActiveCustomer} from '@/features/account/customer';
import { ChangePasswordForm } from './change-password-form';
import { EditProfileForm } from './edit-profile-form';
import { EditEmailForm } from './edit-email-form';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {StorefrontPageHeader} from '@/components/catalogue-page';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});
    return {
        title: t('profilePageTitle'),
    };
}

export default async function ProfilePage() {
    const customer = await getActiveCustomer();
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});

    return (
        <div>
            <StorefrontPageHeader
                title={t('profile')}
                description={t('manageAccountInfo')}
                variant="compact"
            />

            <div className="space-y-6">
                <EditProfileForm customer={customer} />
                <EditEmailForm currentEmail={customer?.emailAddress || ''} />
                <ChangePasswordForm />
            </div>
        </div>
    );
}
