'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CircleAlert, Mail } from 'lucide-react';
import { requestPasswordResetAction } from './actions';
import { AuthField } from '@/components/ui/auth-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Link } from '@/platform/i18n/navigation';
import {useTranslations} from 'next-intl';

function createForgotPasswordSchema(t: ReturnType<typeof useTranslations<'Auth'>>) {
    return z.object({
        emailAddress: z.email(t('emailValidation')),
    });
}

type ForgotPasswordFormData = z.infer<ReturnType<typeof createForgotPasswordSchema>>;

export function ForgotPasswordForm() {
    const t = useTranslations('Auth');
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const forgotPasswordSchema = createForgotPasswordSchema(t);
    const form = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            emailAddress: '',
        },
    });

    const onSubmit = (data: ForgotPasswordFormData) => {
        setServerError(null);

        startTransition(async () => {
            const formData = new FormData();
            formData.append('emailAddress', data.emailAddress);

            const result = await requestPasswordResetAction(undefined, formData);
            if (result?.error) {
                setServerError(result.error);
            } else if (result?.success) {
                setSuccess(true);
            }
        });
    };

    if (success) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle><h2>{t('checkYourEmail')}</h2></CardTitle>
                    <CardDescription>
                        {t('checkYourEmailDescription')}
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Link href="/sign-in">
                        <Button variant="outline" className="w-full">
                            {t('backToSignIn')}
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-5">
                        <FormField
                            control={form.control}
                            name="emailAddress"
                            render={({ field }) => (
                                <FormItem className="animate-field-rise" style={{ animationDelay: '60ms' }}>
                                    <FormLabel>{t('email')}</FormLabel>
                                    <FormControl>
                                        <AuthField icon={Mail}>
                                            <Input
                                                type="email"
                                                autoComplete="email"
                                                placeholder="you@example.com"
                                                disabled={isPending}
                                                className="h-11 pl-10"
                                                {...field}
                                            />
                                        </AuthField>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {serverError && (
                            <div
                                role="alert"
                                className="animate-field-rise flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                            >
                                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                                <span>{serverError}</span>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 mt-4">
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? t('sending') : t('sendResetLink')}
                        </Button>
                        <Link
                            href="/sign-in"
                            className="text-sm text-center text-muted-foreground hover:text-primary"
                        >
                            {t('backToSignIn')}
                        </Link>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
