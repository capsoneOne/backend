'use client';

import {useState, useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {Lock, Mail} from 'lucide-react';
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

const loginSchema = z.object({
    username: z.email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
    redirectTo?: string;
}

export function LoginForm({redirectTo}: LoginFormProps) {
    const t = useTranslations('Auth');
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);

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
        <Card data-size="sm">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-3">
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
                                                className="pl-10"
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
                                    <div className="flex items-center justify-between">
                                        <FormLabel>{t('password')}</FormLabel>
                                        <Link
                                            href="/forgot-password"
                                            className="text-muted-foreground hover:text-primary text-sm"
                                        >
                                            {t('forgotPassword')}
                                        </Link>
                                    </div>

                                    <FormControl>
                                        <AuthField icon={Lock}>
                                            <PasswordInput
                                                autoComplete="current-password"
                                                placeholder="••••••••"
                                                disabled={isPending}
                                                className="pl-10"
                                                {...field}
                                            />
                                        </AuthField>
                                    </FormControl>
                                    <FormMessage/>
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
