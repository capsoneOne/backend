import {ArrowRight, Heart, MapPin, PackageCheck} from 'lucide-react';
import {getTranslations} from 'next-intl/server';

import {Button} from '@/components/ui/button';
import {storefrontSectionClass} from '@/components/storefront-section';
import {getActiveCustomer} from '@/features/account/customer';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';

const fashionLabels = [
    {name: 'NORTH', detail: 'FORM', style: 'tracking-[0.22em]'},
    {name: 'AVENUE', detail: 'EST. 2024', style: 'font-medium italic tracking-[-0.04em]'},
    {name: 'MOTION', detail: 'DAILY GOODS', style: 'tracking-[0.08em]'},
    {name: 'COMMON', detail: 'STUDIO', style: 'font-medium tracking-[-0.05em]'},
    {name: 'ATELIER', detail: 'No. 07', style: 'tracking-[0.16em]'},
    {name: 'ELAN', detail: 'MODERN UNIFORM', style: 'italic tracking-[0.02em]'},
] as const;

function FashionBrandMarquee({label}: {label: string}) {
    return (
        <div
            className="relative min-h-[21rem] overflow-hidden rounded-3xl border border-white/20 bg-background text-foreground shadow-2xl sm:min-h-[25rem]"
            role="img"
            aria-label={label}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_42%),linear-gradient(145deg,var(--background),var(--secondary))]" />
            <div className="relative flex items-center justify-between border-b border-border/70 px-5 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:px-6">
                <span>StyleMatch / Brand edit</span>
                <span>01—06</span>
            </div>

            <div className="relative space-y-3 py-6 sm:py-8" aria-hidden="true">
                {[fashionLabels, [...fashionLabels].reverse()].map((labels, rowIndex) => (
                    <div key={rowIndex} className="brand-marquee-window overflow-hidden">
                        <div className={`brand-marquee-track ${rowIndex === 1 ? 'brand-marquee-track-reverse' : ''}`}>
                            {[0, 1].map((copyIndex) => (
                                <div key={copyIndex} className="flex shrink-0 gap-3" aria-hidden={copyIndex === 1}>
                                    {labels.map((brand) => (
                                        <div
                                            key={`${rowIndex}-${copyIndex}-${brand.name}`}
                                            className="flex h-28 w-44 shrink-0 flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/90 px-4 shadow-[var(--shadow-e1)] sm:h-32 sm:w-52"
                                        >
                                            <span className={`text-xl font-bold sm:text-2xl ${brand.style}`}>
                                                {brand.name}
                                            </span>
                                            <span className="mt-2 text-[0.58rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                                                {brand.detail}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-border/70 bg-background/75 px-5 py-3 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm sm:px-6">
                <span>Independent design</span>
                <span>Everyday wear</span>
            </div>
        </div>
    );
}

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
                            <FashionBrandMarquee label={t('campaignAlt')} />
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
