import type {Metadata} from 'next';
import {getActiveCustomer} from '@/features/account/customer';
import { ChangePasswordForm } from './change-password-form';
import { EditProfileForm } from './edit-profile-form';
import { EditEmailForm } from './edit-email-form';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {AccountPageHeader} from '@/features/account/components/account-page-header';
import {AvatarPicker} from './avatar-picker';

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
            <AccountPageHeader
                title={t('profile')}
                description={t('manageAccountInfo')}
            />

            <div className="space-y-6">
                <AvatarPicker currentAvatar={customer?.customFields?.avatarKey} />
                <EditProfileForm customer={customer} />
                <EditEmailForm currentEmail={customer?.emailAddress || ''} />
                <ChangePasswordForm />
            </div>
        </div>
    );
}
