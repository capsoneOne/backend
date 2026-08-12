import type {Metadata} from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ResetPasswordForm } from './reset-password-form';
import {AuthPageShell} from '@/components/auth-page-shell';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {AuthPageHeader} from '@/features/authentication/components/auth-page-header';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return {
        title: t('resetYourPassword'),
        description: t('resetPasswordPageDescription'),
    };
}

export default async function ResetPasswordPage({searchParams}: PageProps<'/[locale]/reset-password'>) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});

    return (
        <AuthPageShell>
            <div className="space-y-6">
                <AuthPageHeader
                    title={t('resetYourPassword')}
                    description={t('resetYourPasswordDescription')}
                />
                <Suspense fallback={
                    <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                }>
                    <ResetPasswordForm searchParams={searchParams} />
                </Suspense>
            </div>
        </AuthPageShell>
    );
}
