'use client';

import {useState, useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {CircleAlert, Lock, Mail} from 'lucide-react';
import {loginAction} from './actions';
import {AuthField} from '@/components/ui/auth-field';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {PasswordInput} from '@/components/ui/password-input';
import {Card, CardContent, CardFooter} from '@/components/ui/card';
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

/**
 * Built per-render rather than at module scope so the messages come from the
 * active locale. These were hardcoded English while the registration form
 * already translated its equivalents, so a Khmer visitor got Khmer labels and
 * English validation errors on the same form. Both keys already existed —
 * `passwordRequired` was written for exactly this and used nowhere.
 */
function createLoginSchema(t: ReturnType<typeof useTranslations<'Auth'>>) {
    return z.object({
        username: z.email(t('emailValidation')),
        password: z.string().min(1, t('passwordRequired')),
    });
}

type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

interface LoginFormProps {
    redirectTo?: string;
}

export function LoginForm({redirectTo}: LoginFormProps) {
    const t = useTranslations('Auth');
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);

    const loginSchema = createLoginSchema(t);
    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: '',
            password: '',
        },
    });

    const onSubmit = (data: LoginFormData) => {
        setServerError(null);

        startTransition(async () => {
            const formData = new FormData();
            formData.append('username', data.username);
            formData.append('password', data.password);
            if (redirectTo) {
                formData.append('redirectTo', redirectTo);
            }

            const result = await loginAction(undefined, formData);
            if (result?.error) {
                setServerError(result.error);
            }
        });
    };

    const registerHref = redirectTo
        ? `/register?redirectTo=${encodeURIComponent(redirectTo)}`
        : '/register';

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-5">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({field}) => (
                                <FormItem className="animate-field-rise" style={{animationDelay: '60ms'}}>
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
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({field}) => (
                                <FormItem className="animate-field-rise" style={{animationDelay: '140ms'}}>
                                    <FormLabel>{t('password')}</FormLabel>

                                    <FormControl>
                                        <AuthField icon={Lock}>
                                            <PasswordInput
                                                autoComplete="current-password"
                                                placeholder="••••••••"
                                                disabled={isPending}
                                                className="h-11 pl-10"
                                                {...field}
                                            />
                                        </AuthField>
                                    </FormControl>
                                    <FormMessage/>

                                    {/* Sits under the password field, not on the label row. Level with
                                        the label it rendered directly beneath the email input, where it
                                        read as belonging to the email rather than the password. */}
                                    <div className="flex justify-end">
                                        <Link
                                            href="/forgot-password"
                                            className="text-sm text-muted-foreground hover:text-primary"
                                        >
                                            {t('forgotPassword')}
                                        </Link>
                                    </div>
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
                        <Button
                            type="submit"
                            className="animate-field-rise w-full"
                            style={{animationDelay: '220ms'}}
                            disabled={isPending}
                        >
                            {isPending ? t('signingIn') : t('signIn')}
                        </Button>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 mt-1">
                        <div className="text-muted-foreground text-sm text-center">
                            {t('noAccount')}{' '}
                            <Link href={registerHref} className="hover:text-primary underline">
                                {t('register')}
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
