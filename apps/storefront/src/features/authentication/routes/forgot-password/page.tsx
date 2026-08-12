import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import { ForgotPasswordForm } from './forgot-password-form';
import {AuthPageShell} from '@/components/auth-page-shell';
import {AuthPageHeader} from '@/features/authentication/components/auth-page-header';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return {
        title: t('forgotPasswordPageTitle'),
    };
}

export default async function ForgotPasswordPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});

    return (
        <AuthPageShell>
            <div className="space-y-6">
                <AuthPageHeader
                    title={t('forgotPasswordTitle')}
                    description={t('forgotPasswordDescription')}
                />
                <ForgotPasswordForm />
            </div>
        </AuthPageShell>
    );
}
