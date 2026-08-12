import type {Metadata} from 'next';
import {Suspense} from 'react';
import {VerifyLoading} from './verify-loading';
import {VerifyContent} from './verify-content';
import {AuthPageShell} from '@/components/auth-page-shell';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';

// The token-specific client state consumes the locale provider after the URL
// data resolves. Next.js cannot validate that provider boundary as instant.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return {
        title: t('verifyEmailPageTitle'),
        description: t('verifyEmailPageDescription'),
    };
}

async function VerifyRouteContent({
    searchParams,
}: {
    searchParams: PageProps<'/[locale]/verify'>['searchParams'];
}) {
    const {token} = await searchParams;
    return <VerifyContent token={typeof token === 'string' ? token : undefined} />;
}

export default function VerifyPage({searchParams}: PageProps<'/[locale]/verify'>) {
    return (
        <AuthPageShell>
            <div className="space-y-6">
                <Suspense fallback={<VerifyLoading/>}>
                    <VerifyRouteContent searchParams={searchParams}/>
                </Suspense>
            </div>
        </AuthPageShell>
    );
}
