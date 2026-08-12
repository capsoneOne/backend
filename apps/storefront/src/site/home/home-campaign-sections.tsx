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

type CampaignReview = {
    brand: (typeof fashionLabels)[number];
    name: string;
    quote: string;
};

function FashionBrandMarquee({
    label,
    ratingLabel,
    reviewerLabel,
    reviews,
}: {
    label: string;
    ratingLabel: string;
    reviewerLabel: string;
    reviews: readonly CampaignReview[];
}) {
    return (
        <div
            className="relative overflow-hidden border-y border-border bg-muted/35 py-5 text-foreground sm:py-6"
            role="group"
            aria-label={label}
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_36%),radial-gradient(circle_at_85%_90%,color-mix(in_oklch,var(--chart-2)_9%,transparent),transparent_34%)]" />

            <div className="brand-marquee-window relative overflow-hidden">
                <div className="brand-marquee-track">
                    {[0, 1].map((copyIndex) => (
                        <div key={copyIndex} className="flex shrink-0 gap-3" aria-hidden={copyIndex === 1}>
                            {reviews.map((review, reviewIndex) => (
                                <article
                                    key={`${copyIndex}-${review.brand.name}`}
                                    className={`flex w-72 shrink-0 sm:w-80 ${reviewIndex % 2 === 0 ? 'flex-col' : 'flex-col-reverse'}`}
                                >
                                    <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-secondary/55 px-4 sm:h-36" aria-hidden="true">
                                        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:18px_18px] opacity-35 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
                                        <div className="relative text-center">
                                            <p className={`text-2xl font-bold ${review.brand.style}`}>{review.brand.name}</p>
                                            <p className="mt-1.5 text-[0.55rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                                {review.brand.detail}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="min-h-48 rounded-xl border border-border/80 bg-card/95 p-5 shadow-[var(--shadow-e1)]">
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                                {review.name.charAt(0)}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold">{review.name}</p>
                                                <p className="text-[0.68rem] text-muted-foreground">{reviewerLabel}</p>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-sm font-light leading-relaxed text-card-foreground">
                                            “{review.quote}”
                                        </p>
                                        <p className="mt-3 text-xs tracking-[0.12em] text-primary" aria-label={ratingLabel}>
                                            ★★★★★
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export async function SeasonalCampaignSection() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});
    const reviews: CampaignReview[] = [
        {brand: fashionLabels[0], name: 'Maya R.', quote: t('campaignReviews.maya')},
        {brand: fashionLabels[1], name: 'Sofia L.', quote: t('campaignReviews.sofia')},
        {brand: fashionLabels[2], name: 'Jonah K.', quote: t('campaignReviews.jonah')},
        {brand: fashionLabels[3], name: 'Lina P.', quote: t('campaignReviews.lina')},
        {brand: fashionLabels[4], name: 'Amara D.', quote: t('campaignReviews.amara')},
        {brand: fashionLabels[5], name: 'Theo N.', quote: t('campaignReviews.theo')},
    ];

    return (
        <section className={`reveal-section ${storefrontSectionClass} overflow-hidden`}>
            <div className="container mx-auto px-4 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    {t('campaignStoriesEyebrow')}
                </p>
                <h2 className="mt-3 text-balance text-3xl font-bold md:text-4xl">
                    {t('campaignStoriesTitle')}
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-pretty font-light leading-relaxed text-muted-foreground sm:text-lg">
                    {t('campaignStoriesDescription')}
                </p>
            </div>

            <div className="mt-10 w-screen max-w-none">
                <FashionBrandMarquee
                    label={t('campaignAlt')}
                    ratingLabel={t('campaignReviews.ratingLabel')}
                    reviewerLabel={t('campaignReviews.reviewerLabel')}
                    reviews={reviews}
                />
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
