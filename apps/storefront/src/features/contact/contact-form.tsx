'use client';

import {useRef, useState, useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {CircleAlert, CircleCheck, Send} from 'lucide-react';
import {useTranslations} from 'next-intl';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {submitContactAction} from '@/features/contact/actions';

const TOPICS = ['order', 'product', 'other'] as const;

function createContactSchema(t: ReturnType<typeof useTranslations<'Contact'>>) {
    return z.object({
        name: z.string().min(1, t('validation.nameRequired')).max(120),
        email: z.string().email(t('validation.email')).max(255),
        topic: z.enum(TOPICS),
        orderCode: z.string().max(64).optional(),
        message: z.string().min(10, t('validation.messageTooShort')).max(4000),
    });
}

type ContactFormData = z.infer<ReturnType<typeof createContactSchema>>;

interface ContactFormProps {
    /** Prefilled for signed-in senders so they are not retyping what we know. */
    defaultName?: string;
    defaultEmail?: string;
    /** Set when arriving from an order, so the code the copy asks for is already there. */
    defaultOrderCode?: string;
    defaultTopic?: (typeof TOPICS)[number];
}

export function ContactForm({
    defaultName = '',
    defaultEmail = '',
    defaultOrderCode = '',
    defaultTopic = 'order',
}: ContactFormProps) {
    const t = useTranslations('Contact');
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    // The honeypot sits outside react-hook-form, so its value has to be read from
    // the DOM — the submit handler builds FormData from form state alone and would
    // otherwise never send it, leaving the trap doing nothing.
    const honeypotRef = useRef<HTMLInputElement>(null);

    const form = useForm<ContactFormData>({
        resolver: zodResolver(createContactSchema(t)),
        defaultValues: {
            name: defaultName,
            email: defaultEmail,
            topic: defaultTopic,
            orderCode: defaultOrderCode,
            message: '',
        },
    });

    const onSubmit = (data: ContactFormData) => {
        setServerError(null);
        startTransition(async () => {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('email', data.email);
            formData.append('topic', data.topic);
            formData.append('message', data.message);
            if (data.orderCode) formData.append('orderCode', data.orderCode);
            formData.append('company', honeypotRef.current?.value ?? '');

            const result = await submitContactAction(undefined, formData);
            if (result.status === 'success') {
                setSent(true);
                form.reset();
                return;
            }
            setServerError(result.error ?? t('errors.unavailable'));
        });
    };

    if (sent) {
        return (
            <div className="rounded-xl border border-border bg-card p-6">
                <p className="flex items-center gap-2 font-medium">
                    <CircleCheck className="size-5 text-primary" aria-hidden="true" />
                    {t('success.title')}
                </p>
                {/* Restating the wait here matters: the page says days, not hours, and
                    a success message that omits it quietly implies otherwise. */}
                <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                    {t('success.body')}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>
                    {t('success.sendAnother')}
                </Button>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                {/* Honeypot: hidden from people, offered to anything filling every input.
                    aria-hidden and tabIndex keep it away from screen readers and tabbing. */}
                <div className="hidden" aria-hidden="true">
                    <label htmlFor="contact-company">Company</label>
                    <input
                        ref={honeypotRef}
                        id="contact-company"
                        name="company"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                    />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t('fields.name')}</FormLabel>
                                <FormControl>
                                    <Input autoComplete="name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t('fields.email')}</FormLabel>
                                <FormControl>
                                    <Input type="email" autoComplete="email" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="topic"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t('fields.topic')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="w-full">
                                            {/* The label is passed explicitly rather than left to
                                                SelectValue: the items live in a portal that is
                                                unmounted while closed, so Radix has nothing to read
                                                the text from and falls back to the raw value. */}
                                            <SelectValue>{t(`topics.${field.value}`)}</SelectValue>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {TOPICS.map(topic => (
                                            <SelectItem key={topic} value={topic}>
                                                {t(`topics.${topic}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="orderCode"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t('fields.orderCode')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('fields.orderCodePlaceholder')} {...field} />
                                </FormControl>
                                <FormDescription>{t('fields.orderCodeHint')}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="message"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>{t('fields.message')}</FormLabel>
                            <FormControl>
                                <Textarea rows={6} placeholder={t('fields.messagePlaceholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {serverError && (
                    <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
                        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                        {serverError}
                    </p>
                )}

                <Button type="submit" size="lg" disabled={isPending} className="h-12">
                    <Send className="mr-1 size-4" aria-hidden="true" />
                    {isPending ? t('sending') : t('send')}
                </Button>
            </form>
        </Form>
    );
}
