import type {Metadata} from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ResetPasswordForm } from './reset-password-form';
import {AuthPageShell} from '@/components/auth-page-shell';

export const metadata: Metadata = {
    title: 'Reset Password',
    description: 'Create a new password for your account.',
};

export default function ResetPasswordPage({searchParams}: PageProps<'/[locale]/reset-password'>) {
    return (
        <AuthPageShell>
                <Suspense fallback={
                    <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                }>
                    <ResetPasswordForm searchParams={searchParams} />
                </Suspense>
        </AuthPageShell>
    );
}
