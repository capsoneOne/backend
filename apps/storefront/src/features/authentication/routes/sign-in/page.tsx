import type {Metadata} from 'next';
import {Suspense} from 'react';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {AuthPageShell} from '@/components/auth-page-shell';
import {LoginForm} from "./login-form";
import {Card, CardContent, CardFooter} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {SITE_NAME} from "@/config/metadata";

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return {
        title: t('pageTitle'),
    };
}

function LoginFormSkeleton() {
    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-12"/>
                    <Skeleton className="h-10 w-full"/>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16"/>
                    <Skeleton className="h-10 w-full"/>
                </div>
                <Skeleton className="h-10 w-full"/>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">

                <div className="flex flex-col items-center space-y-2">
                    <Skeleton className="h-4 w-40"/>
                </div>
            </CardFooter>
        </Card>
    );
}

async function SignInContent({searchParams}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    return <LoginForm redirectTo={redirectTo}/>;
}

export default async function SignInPage({searchParams}: PageProps<'/[locale]/sign-in'>) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});

    return (
        <AuthPageShell>
                <div className="space-y-6">
                    <div className="space-y-2 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{SITE_NAME}</p>
                        <h1 className="text-3xl font-bold">{t('signIn')}</h1>
                        <p className="text-muted-foreground">
                            {t('enterCredentials')}
                        </p>
                    </div>
                    <Suspense fallback={<LoginFormSkeleton/>}>
                        <SignInContent searchParams={searchParams}/>
                    </Suspense>
                </div>
        </AuthPageShell>
    );
}
