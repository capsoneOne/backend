'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { KeyRound, Lock, Mail, Phone, User, UserRound } from 'lucide-react';
import { registerAction } from './actions';
import { AuthField } from '@/components/ui/auth-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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

function createRegistrationSchema(t: ReturnType<typeof useTranslations<'Auth'>>) {
    return z.object({
        emailAddress: z.string().email(t('emailValidation')),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phoneNumber: z.string().optional(),
        password: z.string().min(8, t('passwordMinLength')),
        confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
        message: t('passwordsMismatch'),
        path: ["confirmPassword"],
    });
}

type RegistrationFormData = z.infer<ReturnType<typeof createRegistrationSchema>>;

interface RegistrationFormProps {
    redirectTo?: string;
}

export function RegistrationForm({ redirectTo }: RegistrationFormProps) {
    const t = useTranslations('Auth');
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);

    const registrationSchema = createRegistrationSchema(t);
    const form = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            emailAddress: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = (data: RegistrationFormData) => {
        setServerError(null);

        startTransition(async () => {
            const formData = new FormData();
            formData.append('emailAddress', data.emailAddress);
            if (data.firstName) formData.append('firstName', data.firstName);
            if (data.lastName) formData.append('lastName', data.lastName);
            if (data.phoneNumber) formData.append('phoneNumber', data.phoneNumber);
            formData.append('password', data.password);
            if (redirectTo) {
                formData.append('redirectTo', redirectTo);
            }

            const result = await registerAction(undefined, formData);
            if (result?.error) {
                setServerError(result.error);
            }
        });
    };

    const signInHref = redirectTo
        ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
        : '/sign-in';

    return (
        <Card data-size="sm">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-3">
                        <FormField
                            control={form.control}
                            name="emailAddress"
                            render={({ field }) => (
                                <FormItem className="animate-field-rise" style={{ animationDelay: '60ms' }}>
                                    <FormLabel>{t('emailAddressLabel')}</FormLabel>
                                    <FormControl>
                                        <AuthField icon={Mail}>
                                            <Input
                                                type="email"
                                                autoComplete="email"
                                                placeholder="you@example.com"
                                                disabled={isPending}
                                                className="pl-10"
                                                {...field}
                                            />
                                        </AuthField>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem className="animate-field-rise" style={{ animationDelay: '120ms' }}>
                                        <FormLabel>{t('firstNameLabel')}</FormLabel>
                                        <FormControl>
                                            <AuthField icon={User}>
                                                <Input
                                                    type="text"
                                                    autoComplete="given-name"
                                                    placeholder={t('firstNamePlaceholder')}
                                                    disabled={isPending}
                                                    className="pl-10"
                                                    {...field}
                                                />
                                            </AuthField>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem className="animate-field-rise" style={{ animationDelay: '160ms' }}>
                                        <FormLabel>{t('lastNameLabel')}</FormLabel>
                                        <FormControl>
                                            <AuthField icon={UserRound}>
                                                <Input
                                                    type="text"
                                                    autoComplete="family-name"
                                                    placeholder={t('lastNamePlaceholder')}
                                                    disabled={isPending}
                                                    className="pl-10"
                                                    {...field}
                                                />
                                            </AuthField>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem className="animate-field-rise" style={{ animationDelay: '200ms' }}>
                                    <FormLabel>{t('phoneNumberLabel')}</FormLabel>
                                    <FormControl>
                                        <AuthField icon={Phone}>
                                            <Input
                                                type="tel"
                                                autoComplete="tel"
                                                placeholder="+1 (555) 000-0000"
                                                disabled={isPending}
                                                className="pl-10"
                                                {...field}
                                            />
                                        </AuthField>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem className="animate-field-rise" style={{ animationDelay: '240ms' }}>
                                    <FormLabel>{t('passwordLabel')}</FormLabel>
                                    <FormControl>
                                        <AuthField icon={Lock}>
                                            <PasswordInput
                                                autoComplete="new-password"
                                                placeholder="••••••••"
                                                disabled={isPending}
                                                className="pl-10"
                                                {...field}
                                            />
                                        </AuthField>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem className="animate-field-rise" style={{ animationDelay: '280ms' }}>
                                    <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                                    <FormControl>
                                        <AuthField icon={KeyRound}>
                                            <PasswordInput
                                                autoComplete="new-password"
                                                placeholder="••••••••"
                                                disabled={isPending}
                                                className="pl-10"
                                                {...field}
                                            />
                                        </AuthField>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {serverError && (
                            <div role="alert" className="animate-field-rise text-sm text-destructive">
                                {serverError}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="animate-field-rise w-full"
                            style={{ animationDelay: '320ms' }}
                            disabled={isPending}
                        >
                            {isPending ? t('creatingAccount') : t('createAccount')}
                        </Button>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 mt-1">

                        <div className="text-sm text-center text-muted-foreground">
                            {t('alreadyHaveAccount')}{' '}
                            <Link href={signInHref} className="hover:text-primary underline">
                                {t('signInLink')}
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
