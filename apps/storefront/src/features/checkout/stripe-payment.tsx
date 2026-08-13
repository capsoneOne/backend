'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {Elements, PaymentElement, useElements, useStripe} from '@stripe/react-stripe-js';
import {loadStripe} from '@stripe/stripe-js';
import {AlertCircle, LockKeyhole, Loader2} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';

import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {prepareStripePayment} from '@/features/checkout/routes/actions';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type StripePaymentDetails = {
    clientSecret: string;
    orderCode: string;
};

export function StripePayment() {
    const t = useTranslations('Checkout');
    const [details, setDetails] = useState<StripePaymentDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const missingKeyMessage = t('stripeMissingPublishableKey');
    const initializationErrorMessage = t('stripeInitializeFailed');

    useEffect(() => {
        let active = true;
        if (!publishableKey) {
            setError(missingKeyMessage);
            return () => {
                active = false;
            };
        }

        void prepareStripePayment().then(result => {
            if (!active) return;
            if (result.success) {
                setDetails({
                    clientSecret: result.clientSecret,
                    orderCode: result.orderCode,
                });
            } else {
                setError(initializationErrorMessage);
            }
        });

        return () => {
            active = false;
        };
    }, [initializationErrorMessage, missingKeyMessage]);

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>{t('stripeUnavailable')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!details || !stripePromise) {
        return (
            <div className="flex min-h-36 items-center justify-center rounded-xl border border-border bg-muted/30">
                <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">{t('stripeLoading')}</span>
            </div>
        );
    }

    return (
        <Elements
            stripe={stripePromise}
            options={{
                clientSecret: details.clientSecret,
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#2563d4',
                        borderRadius: '10px',
                        fontFamily: 'Ubuntu, system-ui, sans-serif',
                    },
                },
            }}
        >
            <StripePaymentForm orderCode={details.orderCode} />
        </Elements>
    );
}

function StripePaymentForm({orderCode}: {orderCode: string}) {
    const stripe = useStripe();
    const elements = useElements();
    const locale = useLocale();
    const t = useTranslations('Checkout');
    const [complete, setComplete] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!stripe || !elements || !complete || submitting) return;

        setSubmitting(true);
        setError(null);
        const result = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/${locale}/order-confirmation/${orderCode}`,
            },
        });

        if (result.error) {
            setError(result.error.message ?? t('stripePaymentFailed'));
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <PaymentElement
                    options={{layout: 'tabs'}}
                    onChange={event => {
                        setComplete(event.complete);
                    }}
                />
            </div>

            {error && (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}

            <Button
                type="submit"
                size="lg"
                disabled={!stripe || !elements || !complete || submitting}
                className="min-h-11 w-full px-5"
            >
                {submitting ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                    <LockKeyhole aria-hidden="true" />
                )}
                {submitting ? t('stripeProcessing') : t('paySecurely')}
            </Button>

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
                {t('stripeSecurityNotice')}
            </p>
        </form>
    );
}
