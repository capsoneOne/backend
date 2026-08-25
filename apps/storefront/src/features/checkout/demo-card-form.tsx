'use client';

import {useState, useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {CircleAlert, CreditCard, Loader2, Lock} from 'lucide-react';
import {useTranslations} from 'next-intl';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {placeOrder} from '@/features/checkout/routes/actions';
import {
    TEST_CARDS,
    cvcLengthFor,
    detectBrand,
    formatCardNumber,
    hasValidLength,
    isCvcValid,
    isExpiryValid,
    isLuhnValid,
    lastFour,
    simulateOutcome,
    stripNonDigits,
} from '@/features/checkout/card-validation';

/**
 * Card entry for the demo checkout.
 *
 * The validation is real — Luhn, brand, length, expiry, CVC — and runs entirely in
 * the browser, so the number never leaves it. Only the authorisation is simulated,
 * which is the one part that would otherwise need a merchant account.
 */

const BRAND_LABELS: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    unionpay: 'UnionPay',
    unknown: '',
};

function createCardSchema(t: ReturnType<typeof useTranslations<'Checkout'>>) {
    return z.object({
        cardName: z.string().min(1, t('card.nameRequired')),
        cardNumber: z.string().superRefine((value, ctx) => {
            const digits = stripNonDigits(value);
            if (digits.length === 0) {
                ctx.addIssue({code: 'custom', message: t('card.numberRequired')});
                return;
            }
            // Length before checksum: on a half-typed number the checksum failure is
            // technically true but reads as "your card is wrong".
            if (!hasValidLength(digits) || !isLuhnValid(digits)) {
                ctx.addIssue({code: 'custom', message: t('card.numberInvalid')});
            }
        }),
        expiry: z.string().superRefine((value, ctx) => {
            const digits = stripNonDigits(value);
            if (digits.length !== 4) {
                ctx.addIssue({code: 'custom', message: t('card.expiryFormat')});
                return;
            }
            if (!isExpiryValid(digits.slice(0, 2), digits.slice(2))) {
                ctx.addIssue({code: 'custom', message: t('card.expiryInvalid')});
            }
        }),
        cvc: z.string(),
    }).superRefine((data, ctx) => {
        // CVC length depends on the brand, so it can only be checked once the number
        // is known — hence here rather than on the field.
        const brand = detectBrand(stripNonDigits(data.cardNumber));
        if (!isCvcValid(data.cvc, brand)) {
            ctx.addIssue({
                code: 'custom',
                path: ['cvc'],
                message: t('card.cvcInvalid', {length: cvcLengthFor(brand)}),
            });
        }
    });
}

type CardFormData = z.infer<ReturnType<typeof createCardSchema>>;

export function DemoCardForm({disabled}: {disabled?: boolean}) {
    const t = useTranslations('Checkout');
    const [isPending, startTransition] = useTransition();
    const [declined, setDeclined] = useState<string | null>(null);

    const form = useForm<CardFormData>({
        resolver: zodResolver(createCardSchema(t)),
        defaultValues: {cardName: '', cardNumber: '', expiry: '', cvc: ''},
    });

    const digits = stripNonDigits(form.watch('cardNumber'));
    const brand = detectBrand(digits);
    const brandLabel = BRAND_LABELS[brand] ?? '';

    const onSubmit = (data: CardFormData) => {
        setDeclined(null);
        const cardDigits = stripNonDigits(data.cardNumber);

        startTransition(async () => {
            const result = await placeOrder('standard-payment', {
                outcome: simulateOutcome(cardDigits),
                brand,
                last4: lastFour(cardDigits),
            });

            // A successful placement redirects, so anything returned here is a refusal.
            if (result && !result.success) {
                setDeclined(t('card.declined'));
            }
        });
    };

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-medium">
                    <CreditCard className="size-4.5 text-primary" aria-hidden="true" />
                    {t('card.title')}
                </p>
                {brandLabel && (
                    <span className="text-xs font-medium text-muted-foreground">{brandLabel}</span>
                )}
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <FormField
                        control={form.control}
                        name="cardName"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t('card.name')}</FormLabel>
                                <FormControl>
                                    <Input autoComplete="cc-name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="cardNumber"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t('card.number')}</FormLabel>
                                <FormControl>
                                    <Input
                                        inputMode="numeric"
                                        autoComplete="cc-number"
                                        placeholder="4242 4242 4242 4242"
                                        {...field}
                                        onChange={event => field.onChange(formatCardNumber(event.target.value))}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="expiry"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>{t('card.expiry')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            inputMode="numeric"
                                            autoComplete="cc-exp"
                                            placeholder="MM / YY"
                                            {...field}
                                            onChange={event => {
                                                const raw = stripNonDigits(event.target.value).slice(0, 4);
                                                field.onChange(
                                                    raw.length > 2 ? `${raw.slice(0, 2)} / ${raw.slice(2)}` : raw,
                                                );
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cvc"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>{t('card.cvc')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            inputMode="numeric"
                                            autoComplete="cc-csc"
                                            maxLength={cvcLengthFor(brand)}
                                            {...field}
                                            onChange={event => field.onChange(stripNonDigits(event.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {declined && (
                        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
                            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                            {declined}
                        </p>
                    )}

                    <Button type="submit" size="lg" disabled={isPending || disabled} className="min-h-11 w-full">
                        {isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                        {t('placeOrder')}
                    </Button>

                    {/* Stated plainly and permanently, not buried in a tooltip: anyone
                        typing a card into a form deserves to know it is not charged. */}
                    <p className="flex items-start gap-2 text-xs font-light leading-relaxed text-muted-foreground">
                        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        <span>
                            {t('card.demoNotice')}{' '}
                            <span className="font-mono">{formatCardNumber(TEST_CARDS.approved)}</span>{' '}
                            {t('card.demoApproves')}{' '}
                            <span className="font-mono">{formatCardNumber(TEST_CARDS.declined)}</span>{' '}
                            {t('card.demoDeclines')}
                        </span>
                    </p>
                </form>
            </Form>
        </div>
    );
}
