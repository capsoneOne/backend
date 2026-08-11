import type {Metadata} from 'next';
import {Suspense} from 'react';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {AuthPageShell} from '@/components/auth-page-shell';
import { RegistrationForm } from "./registration-form";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {SITE_NAME} from "@/config/metadata";

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return {
        title: t('createAccount'),
    };
}

function RegistrationFormSkeleton() {
    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 mt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-44 mx-auto" />
            </CardFooter>
        </Card>
    );
}

async function RegisterContent({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    return <RegistrationForm redirectTo={redirectTo} />;
}

export default async function RegisterPage({searchParams}: PageProps<'/[locale]/register'>) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});

    return (
        <AuthPageShell>
                <div className="space-y-6">
                    <div className="space-y-2 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{SITE_NAME}</p>
                        <h1 className="text-3xl font-bold">{t('createAccount')}</h1>
                        <p className="text-muted-foreground">
                            {t('signUpMessage')}
                        </p>
                    </div>
                    <Suspense fallback={<RegistrationFormSkeleton />}>
                        <RegisterContent searchParams={searchParams} />
                    </Suspense>
                </div>
        </AuthPageShell>
    );
}
