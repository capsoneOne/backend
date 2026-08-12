'use client'

import {ComponentProps, useTransition} from "react";
import {logoutAction} from '@/features/authentication/logout';
import {useRouter} from '@/platform/i18n/navigation';
import {useTranslations} from 'next-intl';
import {LoaderCircle, LogIn, LogOut} from 'lucide-react';

interface LoginButtonProps extends ComponentProps<'button'> {
    isLoggedIn: boolean;
}

export function LoginButton({isLoggedIn, disabled, ...props}: LoginButtonProps) {
    const t = useTranslations('Navigation');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    return (
        <button {...props} disabled={disabled || isPending} aria-disabled={isPending}
                onClick={() => {
                    if (isLoggedIn) {
                        startTransition(async () => {
                            await logoutAction()
                        })
                    } else {
                        router.push('/sign-in')
                    }
                }}>
            {isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : isLoggedIn ? (
                <LogOut className="size-4" aria-hidden="true" />
            ) : (
                <LogIn className="size-4" aria-hidden="true" />
            )}
            <span>{isLoggedIn ? t('signOut') : t('signIn')}</span>
        </button>
    )
}
