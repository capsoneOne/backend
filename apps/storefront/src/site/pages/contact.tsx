import type {Metadata} from 'next';
import {Suspense} from 'react';
import {getTranslations} from 'next-intl/server';

import {getActiveCustomer} from '@/features/account/customer';
import {ContactForm} from '@/features/contact/contact-form';
import {getRouteLocale} from '@/platform/i18n/server';
import {ContentPage, ContentSections, buildContentMetadata} from '@/site/pages/content-page';

const TOPICS = ['order', 'product', 'other'] as const;

export function generateMetadata(): Promise<Metadata> {
    return buildContentMetadata({key: 'contact', path: '/contact'});
}

export default function Page({searchParams}: PageProps<'/[locale]/contact'>) {
    return (
        <ContentPage contentKey="contact">
            <ContentSections contentKey="contact" count={4} />
            {/* The prose above tells people to get in touch; until this section
                existed it never said how.

                The searchParams promise is passed down rather than awaited here:
                under cacheComponents, awaiting it in the page body makes the whole
                route a blocking prerender. Resolving it inside the boundary keeps
                the prose static and defers only the form. */}
            <Suspense fallback={<ContactSectionSkeleton />}>
                <ContactSection searchParams={searchParams} />
            </Suspense>
        </ContentPage>
    );
}

async function ContactSection({searchParams}: {searchParams: PageProps<'/[locale]/contact'>['searchParams']}) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Contact'});

    const resolved = await searchParams;
    const orderCode = typeof resolved.order === 'string' ? resolved.order : '';
    const topicParam = typeof resolved.topic === 'string' ? resolved.topic : undefined;
    const topic = TOPICS.find(value => value === topicParam);

    // A signed-out visitor is the normal case here, so a failed lookup is not an
    // error — it just means there is nothing to prefill.
    const customer = await getActiveCustomer().catch(() => null);
    const fullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ');

    return (
        <section className="mt-12 border-t border-border pt-10">
            <h2 className="text-2xl font-bold">{t('heading')}</h2>
            <p className="mt-2 text-pretty font-light leading-relaxed text-muted-foreground">
                {t('lede')}
            </p>

            <div className="mt-8">
                <ContactForm
                    defaultName={fullName}
                    defaultEmail={customer?.emailAddress ?? ''}
                    defaultOrderCode={orderCode}
                    defaultTopic={topic ?? (orderCode ? 'order' : 'other')}
                />
            </div>
        </section>
    );
}

function ContactSectionSkeleton() {
    return (
        <section className="mt-12 border-t border-border pt-10" aria-hidden="true">
            <div className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
            <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
            <div className="mt-8 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                </div>
                <div className="h-40 animate-pulse rounded-lg bg-muted" />
            </div>
        </section>
    );
}
