'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from '@/platform/i18n/navigation';
import {useTranslations} from 'next-intl';
import {CircleAlert, Info, Loader2, QrCode, RefreshCw, ScanLine, ShieldCheck, Smartphone} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {
    generatePayWayQr,
    pollPayWayPayment,
    type PayWayPaymentSession,
} from '@/features/checkout/routes/actions';

/**
 * ABA KHQR payment step.
 *
 * A QR payment is not a form submission: there is no moment where the browser knows
 * the money moved. The customer scans with any Bakong member bank app, pays there,
 * and this screen finds out only by asking the server, which asks PayWay. So the
 * whole step is a QR plus a poll, and every terminal outcome arrives from the server.
 *
 * The poll interval is deliberately unhurried. A KHQR transfer takes seconds, not
 * milliseconds, and each poll costs a round trip to PayWay — polling faster would not
 * make the money arrive sooner.
 */

const POLL_INTERVAL_MS = 3_000;

export function KhqrPayment({disabled}: {disabled?: boolean}) {
    const t = useTranslations('Checkout');
    const router = useRouter();

    const [session, setSession] = useState<PayWayPaymentSession | null>(null);
    const [status, setStatus] = useState<'idle' | 'creating' | 'waiting' | 'done'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    // Guards the redirect: a poll already in flight when settlement lands would
    // otherwise fire a second navigation.
    const settledRef = useRef(false);

    const start = useCallback(async () => {
        setStatus('creating');
        setError(null);
        settledRef.current = false;

        const result = await generatePayWayQr();
        setSession(result);

        if (!result.success) {
            setError(result.message);
            setStatus('idle');
            return;
        }
        setStatus('waiting');
    }, []);

    // --- polling -------------------------------------------------------------

    useEffect(() => {
        if (!session?.success || status === 'done') return;

        let cancelled = false;

        const tick = async () => {
            const state = await pollPayWayPayment(session.transactionId);
            if (cancelled || settledRef.current) return;

            if (state.settled) {
                settledRef.current = true;
                setStatus('done');
                router.push(`/order-confirmation/${state.orderCode ?? session.orderCode}`);
                return;
            }

            if (state.status === 'DECLINED' || state.status === 'CANCELLED') {
                setError(t('khqrFailed'));
                setStatus('idle');
                setSession(null);
            }
            // PENDING is the normal case, and UNKNOWN is a transaction PayWay has not
            // registered yet or a failed poll. Neither is a reason to stop waiting.
        };

        const timer = setInterval(tick, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [session, status, router, t]);

    // --- expiry countdown ----------------------------------------------------

    useEffect(() => {
        if (!session?.success) {
            setSecondsLeft(null);
            return;
        }
        const expiresAt = Date.parse(session.expiresAt);

        const update = () => setSecondsLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
        update();

        const timer = setInterval(update, 1_000);
        return () => clearInterval(timer);
    }, [session]);

    // --- render --------------------------------------------------------------

    if (!session?.success) {
        return (
            <div className="space-y-3">
                {error && (
                    <p className="flex items-center gap-2 text-sm text-destructive">
                        <CircleAlert className="h-4 w-4 shrink-0" />
                        {error}
                    </p>
                )}
                <Button
                    onClick={start}
                    disabled={disabled || status === 'creating'}
                    size="lg"
                    className="min-h-11 w-full px-5"
                >
                    {status === 'creating' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <QrCode className="mr-2 h-4 w-4" />
                    )}
                    {t('khqrShowQr')}
                </Button>
            </div>
        );
    }

    const expired = secondsLeft === 0;

    return (
        <div className="space-y-4 rounded-lg border p-5">
            <div className="flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium">{t('khqrTitle')}</h4>
            </div>

            <p className="text-sm text-muted-foreground">{t('khqrInstructions')}</p>

            {/* Sandbox QRs carry a placeholder merchant account, so a real banking app
                answers "transaction not found". Saying so here beats letting someone
                discover it by scanning and concluding the checkout is broken. Driven by
                the same environment flag that picks the API host, so it disappears in
                production without anyone remembering to remove it. */}
            {session.sandbox && (
                <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    {t('khqrSandboxNotice')}
                </p>
            )}

            <div className="flex justify-center">
                {/* A plain <img>: a data URI has nothing for next/image to optimise,
                    and routing it through the image loader would only re-encode bytes
                    we already hold. */}
                <img
                    src={session.qrImage}
                    alt={t('khqrTitle')}
                    className="w-64 max-w-full rounded-md"
                />
            </div>

            <div className="flex items-center justify-center gap-2 text-sm">
                {status === 'done' ? (
                    <span className="flex items-center gap-2 text-green-600">
                        <ShieldCheck className="h-4 w-4" />
                        {t('khqrPaid')}
                    </span>
                ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('khqrWaiting')}
                    </span>
                )}
            </div>

            {secondsLeft !== null && !expired && status !== 'done' && (
                <p className="text-center text-xs text-muted-foreground">
                    {t('khqrExpiresIn', {
                        time: `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`,
                    })}
                </p>
            )}

            {expired && status !== 'done' && (
                <Button onClick={start} variant="outline" className="min-h-11 w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('khqrNewQr')}
                </Button>
            )}

            {/* Only useful on the phone that would receive the deep link; on a desktop
                it opens nothing, which is why it sits below the QR rather than beside it. */}
            {session.abaDeeplink && !expired && status !== 'done' && (
                <a
                    href={session.abaDeeplink}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-md border text-sm sm:hidden"
                >
                    <Smartphone className="h-4 w-4" />
                    {t('khqrOpenAba')}
                </a>
            )}
        </div>
    );
}
