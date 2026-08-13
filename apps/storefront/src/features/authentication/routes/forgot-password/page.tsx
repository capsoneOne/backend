import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import { ForgotPasswordForm } from './forgot-password-form';
import {AuthPageShell} from '@/components/auth-page-shell';
import {AuthPageHeader} from '@/features/authentication/components/auth-page-header';
import {AuthShowcase} from '@/features/authentication/components/auth-showcase';

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
        <AuthPageShell aside={<AuthShowcase variant="forgot-password" />}>
            <div className="space-y-4">
                <AuthPageHeader
                    title={t('forgotPasswordTitle')}
                    description={t('forgotPasswordDescription')}
                />
                <ForgotPasswordForm />
            </div>
        </AuthPageShell>
    );
}
