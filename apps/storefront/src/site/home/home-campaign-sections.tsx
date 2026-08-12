import Image from 'next/image';
import {ArrowRight, Heart, MapPin, PackageCheck} from 'lucide-react';
import {getTranslations} from 'next-intl/server';

import {Button} from '@/components/ui/button';
import {storefrontSectionClass} from '@/components/storefront-section';
import {getActiveCustomer} from '@/features/account/customer';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';

export async function SeasonalCampaignSection() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});

    return (
        <section className={`reveal-section ${storefrontSectionClass}`}>
            <div className="container mx-auto px-4">
                <div className="relative isolate overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-[var(--shadow-e3)]">
                    <div className="pointer-events-none absolute -left-24 -top-28 size-72 rounded-full bg-white/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-cyan-300/15 blur-3xl" />

                    <div className="grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-12">
                        <div className="relative z-10 max-w-2xl">
                            <h2 className="text-balance text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                                {t('campaignTitle')}
                            </h2>
                            <p className="mt-4 max-w-xl text-pretty font-light leading-relaxed text-primary-foreground/80 sm:text-lg">
                                {t('campaignDescription')}
                            </p>
                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                <Button
                                    render={<Link href="/featured" />}
                                    nativeButton={false}
                                    size="lg"
                                    className="h-12 rounded-xl bg-background px-6 text-foreground shadow-md hover:bg-background/95"
                                >
                                    {t('campaignPrimary')}
                                    <ArrowRight className="ml-1 size-4" aria-hidden="true" />
                                </Button>
                                <Button
                                    render={<Link href="/search" />}
                                    nativeButton={false}
                                    variant="outline"
                                    size="lg"
                                    className="h-12 rounded-xl border-white/30 bg-white/5 px-6 text-primary-foreground hover:bg-white/12 hover:text-primary-foreground dark:border-white/25 dark:bg-white/5"
                                >
                                    {t('campaignSecondary')}
                                </Button>
                            </div>
                        </div>

                        <div className="relative mx-auto w-full max-w-[31rem]">
                            <div className="absolute inset-6 rounded-full bg-cyan-200/20 blur-3xl" />
                            <div className="relative rounded-3xl border border-white/20 bg-white/95 p-4 shadow-2xl sm:p-6">
                                <Image
                                    src="/storyset/choosing-clothes-cuate.svg"
                                    alt={t('campaignAlt')}
                                    width={520}
                                    height={420}
                                    className="h-auto w-full object-contain"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

const accountBenefits = [
    {key: 'wishlist', icon: Heart, href: '/wishlist'},
    {key: 'orders', icon: PackageCheck, href: '/account/orders'},
    {key: 'addresses', icon: MapPin, href: '/account/addresses'},
] as const;

export async function MemberBenefitsSection() {
    const locale = await getRouteLocale();
    const [t, customer] = await Promise.all([
        getTranslations({locale, namespace: 'Home'}),
        getActiveCustomer(),
    ]);
    const isSignedIn = Boolean(customer);

    return (
        <section className={`reveal-section ${storefrontSectionClass}`}>
            <div className="container mx-auto px-4">
                <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-[var(--shadow-e2)] sm:p-8 lg:p-10">
                    <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                {t(isSignedIn ? 'memberSignedInEyebrow' : 'memberEyebrow')}
                            </p>
                            <h2 className="mt-3 text-balance text-3xl font-bold md:text-4xl">
                                {t(isSignedIn ? 'memberSignedInTitle' : 'memberTitle')}
                            </h2>
                            <p className="mt-3 max-w-2xl font-light leading-relaxed text-muted-foreground">
                                {t(isSignedIn ? 'memberSignedInDescription' : 'memberDescription')}
                            </p>

                            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                {accountBenefits.map(({key, icon: Icon, href}) => {
                                    const content = (
                                        <>
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                                            <Icon className="size-4.5" aria-hidden="true" />
                                        </span>
                                        <span className="text-sm font-medium">{t(`memberBenefits.${key}`)}</span>
                                        </>
                                    );

                                    return isSignedIn ? (
                                        <Link
                                            key={key}
                                            href={href}
                                            className="flex min-h-16 items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3 transition-[border-color,background-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-background hover:shadow-[var(--shadow-e1)]"
                                        >
                                            {content}
                                        </Link>
                                    ) : (
                                        <div key={key} className="flex min-h-16 items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
                                            {content}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex min-w-52 flex-col gap-3">
                            <Button
                                render={<Link href={isSignedIn ? '/account/profile' : '/register'} />}
                                nativeButton={false}
                                size="lg"
                                className="h-12 rounded-xl px-6"
                            >
                                {t(isSignedIn ? 'memberSignedInPrimary' : 'memberPrimary')}
                                <ArrowRight className="ml-1 size-4" aria-hidden="true" />
                            </Button>
                            <Link
                                href={isSignedIn ? '/categories' : '/sign-in'}
                                className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                            >
                                {t(isSignedIn ? 'memberSignedInSecondary' : 'memberSecondary')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
