'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from '@/platform/i18n/navigation';
import {useTranslations} from 'next-intl';
import {CircleAlert, CreditCard, ExternalLink, Loader2, ShieldCheck} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {
    createPayWayCardCheckout,
    pollPayWayPayment,
    type PayWayCardCheckout,
} from '@/features/checkout/routes/actions';

/**
 * Card payment through PayWay's hosted checkout.
 *
 * PayWay's purchase endpoint answers with an HTML page rather than a URL, so it can
 * only be reached by a form POST — hence the hidden form rather than a redirect. The
 * page opens in a new tab so the checkout stays where it is; this tab keeps polling
 * and completes on its own when the payment lands.
 *
 * Polling rather than a return URL is deliberate: a payer who closes PayWay's tab
 * instead of clicking through would never hit a redirect, and their paid order would
 * sit unsettled. Asking the server is the same path KHQR uses and does not depend on
 * the payer coming back.
 */

const POLL_INTERVAL_MS = 3_000;

export function PayWayCardPayment({disabled}: {disabled?: boolean}) {
    const t = useTranslations('Checkout');
    const router = useRouter();

    const [checkout, setCheckout] = useState<PayWayCardCheckout | null>(null);
    const [status, setStatus] = useState<'idle' | 'creating' | 'waiting' | 'done'>('idle');
    const [error, setError] = useState<string | null>(null);

    const formRef = useRef<HTMLFormElement>(null);
    const settledRef = useRef(false);

    const start = useCallback(async () => {
        setStatus('creating');
        setError(null);
        settledRef.current = false;

        const result = await createPayWayCardCheckout();
        setCheckout(result);

        if (!result.success) {
            setError(result.message);
            setStatus('idle');
            return;
        }
        setStatus('waiting');
    }, []);

    // Submitting from an effect, once the fields are actually in the DOM. Calling
    // submit() in the same tick as setState would post an empty form.
    useEffect(() => {
        if (checkout?.success && status === 'waiting') {
            formRef.current?.submit();
        }
    }, [checkout, status]);

    useEffect(() => {
        if (!checkout?.success || status !== 'waiting') return;

        let cancelled = false;

        const tick = async () => {
            const state = await pollPayWayPayment(checkout.transactionId);
            if (cancelled || settledRef.current) return;

            if (state.settled) {
                settledRef.current = true;
                setStatus('done');
                router.push(`/order-confirmation/${state.orderCode ?? checkout.orderCode}`);
                return;
            }
            if (state.status === 'DECLINED' || state.status === 'CANCELLED') {
                setError(t('cardDeclined'));
                setStatus('idle');
                setCheckout(null);
            }
            // PENDING is the payer still on PayWay's page; UNKNOWN is a transaction not
            // registered yet or a failed poll. Neither is a reason to stop waiting.
        };

        const timer = setInterval(tick, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [checkout, status, router, t]);

    return (
        <div className="space-y-3">
            {error && (
                <p className="flex items-center gap-2 text-sm text-destructive">
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    {error}
                </p>
            )}

            {checkout?.success && (
                <form
                    ref={formRef}
                    action={checkout.actionUrl}
                    method="POST"
                    encType="multipart/form-data"
                    target="payway_checkout"
                    className="hidden"
                >
                    {checkout.fields.map(field => (
                        <input key={field.name} type="hidden" name={field.name} value={field.value} readOnly />
                    ))}
                </form>
            )}

            {status === 'waiting' || status === 'done' ? (
                <div className="space-y-3 rounded-lg border p-5">
                    <div className="flex items-center justify-center gap-2 text-sm">
                        {status === 'done' ? (
                            <span className="flex items-center gap-2 text-green-600">
                                <ShieldCheck className="h-4 w-4" />
                                {t('khqrPaid')}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t('cardWaiting')}
                            </span>
                        )}
                    </div>

                    {status === 'waiting' && (
                        <>
                            <p className="text-center text-sm text-muted-foreground">
                                {t('cardInstructions')}
                            </p>
                            {/* The popup blocker eats the first submit often enough that a
                                manual way back to the page has to exist. */}
                            <Button
                                variant="outline"
                                className="min-h-11 w-full"
                                onClick={() => formRef.current?.submit()}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                {t('cardReopen')}
                            </Button>
                        </>
                    )}
                </div>
            ) : (
                <Button
                    onClick={start}
                    disabled={disabled || status === 'creating'}
                    size="lg"
                    className="min-h-11 w-full px-5"
                >
                    {status === 'creating' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    {t('cardPayWithPayway')}
                </Button>
            )}
        </div>
    );
}
