import type {Metadata} from 'next';
import {Suspense} from 'react';
import {VerifyLoading} from './verify-loading';
import {VerifyContent} from './verify-content';
import {AuthPageShell} from '@/components/auth-page-shell';

export const metadata: Metadata = {
    title: 'Verify Email',
    description: 'Verify your email address to complete registration.',
};

export default function VerifyPage({searchParams}: PageProps<'/[locale]/verify'>) {
    return (
        <AuthPageShell>
            <div className="space-y-6">
                <Suspense fallback={<VerifyLoading/>}>
                    <VerifyContent searchParams={searchParams}/>
                </Suspense>
            </div>
        </AuthPageShell>
    );
}
