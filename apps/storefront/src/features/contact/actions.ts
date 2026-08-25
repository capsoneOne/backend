'use server';

import {headers} from 'next/headers';
import {getTranslations} from 'next-intl/server';

import {SubmitContactMessageMutation} from '@/features/contact/graphql';
import {getAuthToken} from '@/platform/vendure/auth-token';
import {mutate} from '@/platform/vendure/api';

export interface ContactFormState {
    status: 'idle' | 'success' | 'error';
    error?: string;
}

const CLIENT_IP_HEADER = 'x-contact-client-ip';

/**
 * Reads the visitor's address so the API can rate-limit per sender. Without this
 * every submission arrives from the Next.js process and the per-sender limit
 * collapses into a global one — see ContactService.hashSubmitter on the server.
 */
async function getClientAddress(): Promise<string | null> {
    const headerList = await headers();
    // Left-most entry is the original client; the rest are proxies that appended
    // themselves on the way here.
    const forwarded = headerList.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]!.trim() || null;
    return headerList.get('x-real-ip');
}

export async function submitContactAction(
    _prevState: ContactFormState | undefined,
    formData: FormData,
): Promise<ContactFormState> {
    const t = await getTranslations('Contact');

    // Honeypot. A field hidden from people but present in the DOM, so anything that
    // fills every input gives itself away. Reporting success rather than an error
    // keeps a bot from learning the field is what stopped it.
    if ((formData.get('company') as string | null)?.trim()) {
        return {status: 'success'};
    }

    const name = ((formData.get('name') as string) ?? '').trim();
    const email = ((formData.get('email') as string) ?? '').trim();
    const topic = ((formData.get('topic') as string) ?? '').trim();
    const message = ((formData.get('message') as string) ?? '').trim();
    const orderCode = ((formData.get('orderCode') as string) ?? '').trim();

    if (!name || !email || !message) {
        return {status: 'error', error: t('errors.required')};
    }

    const clientAddress = await getClientAddress();
    const token = await getAuthToken();

    try {
        const result = await mutate(
            SubmitContactMessageMutation,
            {input: {name, email, topic: topic || 'other', orderCode: orderCode || null, message}},
            {
                token,
                fetch: clientAddress ? {headers: {[CLIENT_IP_HEADER]: clientAddress}} : undefined,
            },
        );

        const submission = result.data.submitContactMessage;
        if (submission.success) return {status: 'success'};

        return {
            status: 'error',
            error:
                submission.errorCode === 'RATE_LIMITED'
                    ? t('errors.rateLimited')
                    : t('errors.invalid'),
        };
    } catch {
        // The message is the only thing the sender has; a stack trace in the console
        // is no use to them, so say plainly that it did not go through.
        return {status: 'error', error: t('errors.unavailable')};
    }
}
