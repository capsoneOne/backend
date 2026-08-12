import {ArrowRight, Heart, MapPin, PackageCheck} from 'lucide-react';
import Image from 'next/image';
import {getTranslations} from 'next-intl/server';

import {Button} from '@/components/ui/button';
import {TestimonialsSection} from '@/components/ui/testimonials-6';
import {storefrontSectionClass} from '@/components/storefront-section';
import {getActiveCustomer} from '@/features/account/customer';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';

const marketplaceBrands = [
    {name: 'Apple', logo: 'apple', category: 'technology'},
    {name: 'Samsung', logo: 'samsung', category: 'technology'},
    {name: 'Sony', logo: 'sony', category: 'technology'},
    {name: 'JBL', logo: 'jbl', category: 'technology'},
    {name: 'UNIQLO', logo: 'uniqlo', category: 'fashion'},
    {name: 'H&M', logo: 'hm', category: 'fashion'},
    {name: 'Tommy Hilfiger', logo: 'tommy', category: 'fashion'},
    {name: 'Calvin Klein', logo: 'calvin-klein', category: 'fashion'},
    {name: 'Marithé + François Girbaud', logo: 'marithe', category: 'fashion'},
    {name: 'Nike', logo: 'nike', category: 'sports'},
    {name: 'adidas', logo: 'adidas', category: 'sports'},
    {name: 'Sephora', logo: 'sephora', category: 'beauty'},
    {name: "L'Oréal Paris", logo: 'loreal', category: 'beauty'},
    {name: 'IKEA', logo: 'ikea', category: 'home'},
    {name: 'Philips', logo: 'philips', category: 'home'},
    {name: 'DAPPER', logo: 'dapper', category: 'fashion'},
    {name: 'LYN', logo: 'lyn', category: 'fashion'},
    {name: 'Padini Concept Store', logo: 'padini', category: 'fashion'},
    {name: 'Xiaomi', logo: 'xiaomi', category: 'technology'},
    {name: 'Bose', logo: 'bose', category: 'technology'},
    {name: 'Canon', logo: 'canon', category: 'technology'},
    {name: "Levi's", logo: 'levis', category: 'fashion'},
    {name: 'New Balance', logo: 'new-balance', category: 'sports'},
    {name: 'PUMA', logo: 'puma', category: 'sports'},
    {name: 'NIVEA', logo: 'nivea', category: 'beauty'},
    {name: 'COSRX', logo: 'cosrx', category: 'beauty'},
    {name: 'MUJI', logo: 'muji', category: 'home'},
    {name: 'Tefal', logo: 'tefal', category: 'home'},
    {name: 'LEGO', logo: 'lego', category: 'toys'},
    {name: 'Barbie', logo: 'barbie', category: 'toys'},
] as const;

type MarketplaceBrand = (typeof marketplaceBrands)[number];
type MarketplaceCategory = MarketplaceBrand['category'];

const brandRows = [
    marketplaceBrands.slice(0, 10),
    marketplaceBrands.slice(10, 20),
    marketplaceBrands.slice(20),
] as const;
const marketplaceCategories = ['technology', 'fashion', 'beauty', 'home', 'sports', 'toys'] as const;

function BrandLogo({brand}: {brand: MarketplaceBrand}) {
    switch (brand.logo) {
        case 'apple':
            return <span className="text-4xl font-semibold tracking-[-0.08em]">Apple</span>;
        case 'samsung':
            return <span className="-skew-x-6 text-3xl font-black uppercase tracking-[-0.07em] text-[#0b4da2] dark:text-[#7bb7ff]">Samsung</span>;
        case 'sony':
            return <span className="font-serif text-4xl font-bold uppercase tracking-[-0.06em]">Sony</span>;
        case 'jbl':
            return <span className="rounded-sm bg-[#ff4f00] px-4 py-2 text-3xl font-black tracking-[-0.08em] text-white">JBL</span>;
        case 'uniqlo':
            return <Image src="/brands/uniqlo.svg" alt="" width={64} height={64} className="size-16 shadow-sm" />;
        case 'hm':
            return <Image src="/brands/hm.svg" alt="" width={72} height={72} className="size-16 object-contain" />;
        case 'nike':
            return <span className="-skew-x-12 text-4xl font-black italic uppercase tracking-[-0.1em]">Nike</span>;
        case 'adidas':
            return (
                <span className="flex items-end gap-2 text-3xl font-bold lowercase tracking-[-0.08em]">
                    <span className="flex h-7 items-end gap-0.5" aria-hidden="true">
                        <span className="h-3 w-2 -skew-x-12 bg-current" />
                        <span className="h-5 w-2 -skew-x-12 bg-current" />
                        <span className="h-7 w-2 -skew-x-12 bg-current" />
                    </span>
                    adidas
                </span>
            );
        case 'sephora':
            return <span className="font-serif text-3xl uppercase tracking-[0.08em]">Sephora</span>;
        case 'loreal':
            return (
                <span className="text-center">
                    <span className="block text-2xl font-light tracking-[-0.05em]">L’ORÉAL</span>
                    <span className="block text-[0.55rem] tracking-[0.45em]">PARIS</span>
                </span>
            );
        case 'ikea':
            return <span className="rounded-[50%] border-[7px] border-[#ffda1a] bg-[#0058a3] px-6 py-2 text-2xl font-black text-[#ffda1a]">IKEA</span>;
        case 'philips':
            return <span className="text-3xl font-black uppercase tracking-[-0.05em] text-[#0b5cab] dark:text-[#7bb7ff]">Philips</span>;
        case 'xiaomi':
            return (
                <span className="flex items-center gap-3 text-3xl font-semibold tracking-[-0.08em]">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#ff6900] text-sm font-black text-white">mi</span>
                    Xiaomi
                </span>
            );
        case 'bose':
            return <span className="-skew-x-12 text-4xl font-black uppercase tracking-[-0.1em]">Bose</span>;
        case 'canon':
            return <span className="font-serif text-4xl font-bold tracking-[-0.08em] text-[#cc0000] dark:text-[#ff7777]">Canon</span>;
        case 'levis':
            return <span className="rounded-t-lg bg-[#c41230] px-5 py-2 text-3xl font-bold text-white">Levi’s</span>;
        case 'new-balance':
            return (
                <span className="flex items-center gap-2 text-2xl font-black italic tracking-[-0.08em] text-[#d71920] dark:text-[#ff7777]">
                    <span className="text-4xl">NB</span> new balance
                </span>
            );
        case 'puma':
            return <span className="text-4xl font-black uppercase tracking-[0.04em]">PUMA</span>;
        case 'nivea':
            return <span className="grid size-20 place-items-center rounded-full bg-[#003d8f] text-xl font-black tracking-[0.08em] text-white">NIVEA</span>;
        case 'cosrx':
            return <span className="text-4xl font-light uppercase tracking-[0.04em]">COSRX</span>;
        case 'muji':
            return <span className="bg-[#7f0019] px-5 py-2 text-3xl font-bold tracking-[0.08em] text-white">無印良品</span>;
        case 'tefal':
            return <span className="text-4xl font-bold tracking-[-0.1em] text-[#e30613] dark:text-[#ff7777]">Tefal</span>;
        case 'lego':
            return <span className="rounded-lg border-4 border-[#ffcf00] bg-[#d71920] px-3 py-1 text-3xl font-black tracking-[-0.08em] text-white shadow-[inset_0_0_0_2px_#fff]">LEGO</span>;
        case 'barbie':
            return <span className="-rotate-6 font-serif text-4xl font-bold italic tracking-[-0.08em] text-[#e6008d] dark:text-[#ff75c5]">Barbie</span>;
        case 'dapper':
            return <span className="border-y-2 border-foreground py-1.5 text-3xl font-black tracking-[0.18em]">DAPPER</span>;
        case 'marithe':
            return (
                <span className="max-w-52 text-center font-serif text-xl font-bold uppercase leading-[1.05] tracking-[-0.04em]">
                    Marithé <span className="text-primary">+</span><br />François Girbaud
                </span>
            );
        case 'tommy':
            return (
                <span className="flex items-center gap-3 text-xl font-bold uppercase tracking-[0.08em]">
                    <span className="grid h-7 w-12 grid-cols-2 overflow-hidden border border-[#101f3c]" aria-hidden="true">
                        <span className="bg-white" /><span className="bg-[#d71920]" />
                    </span>
                    <span>Tommy Hilfiger</span>
                </span>
            );
        case 'calvin-klein':
            return <span className="text-3xl font-medium tracking-[-0.08em]">Calvin Klein</span>;
        case 'lyn':
            return <span className="border-b-2 border-foreground pb-1 text-5xl font-light tracking-[0.22em]">LYN</span>;
        case 'padini':
            return (
                <span className="text-center">
                    <span className="block text-3xl font-black tracking-[0.14em]">PADINI</span>
                    <span className="mt-1 block text-[0.55rem] font-semibold uppercase tracking-[0.3em]">Concept Store</span>
                </span>
            );
    }
}

function MarketplaceBrandMarquee({
    label,
    categoryLabels,
}: {
    label: string;
    categoryLabels: Record<MarketplaceCategory, string>;
}) {
    return (
        <div
            className="relative overflow-hidden border-y border-border bg-muted/35 py-6 text-foreground sm:py-8"
            role="group"
            aria-label={label}
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_36%),radial-gradient(circle_at_85%_90%,color-mix(in_oklch,var(--chart-2)_9%,transparent),transparent_34%)]" />

            <div className="brand-marquee-window relative space-y-3 overflow-hidden">
                {brandRows.map((brands, rowIndex) => (
                    <div
                        key={rowIndex}
                        className={`brand-marquee-track ${rowIndex === 1 ? 'brand-marquee-track-reverse' : ''} ${rowIndex === 2 ? 'brand-marquee-track-slow' : ''}`}
                    >
                        {[0, 1].map((copyIndex) => (
                            <div key={copyIndex} className="flex shrink-0 gap-3" aria-hidden={copyIndex === 1}>
                                {brands.map((brand) => (
                                    <div
                                        key={`${copyIndex}-${brand.name}`}
                                        className="group relative flex h-28 w-60 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-card/80 px-6 shadow-[var(--shadow-e1)] transition-colors hover:border-primary/30 hover:bg-card sm:w-64"
                                        role="img"
                                        aria-label={`${brand.name} logo, ${categoryLabels[brand.category]}`}
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:18px_18px] opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
                                        <span className="absolute left-4 top-3 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                                            {categoryLabels[brand.category]}
                                        </span>
                                        <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105"><BrandLogo brand={brand} /></div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export async function SeasonalCampaignSection() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});

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
                <div className="mt-6 flex flex-wrap justify-center gap-2" aria-label={t('campaignCategoriesLabel')}>
                    {marketplaceCategories.map((category) => (
                        <span key={category} className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                            {t(`campaignCategories.${category}`)}
                        </span>
                    ))}
                </div>
            </div>

            <div className="mt-10 w-screen max-w-none">
                <MarketplaceBrandMarquee
                    label={t('campaignAlt')}
                    categoryLabels={Object.fromEntries(
                        marketplaceCategories.map((category) => [category, t(`campaignCategories.${category}`)]),
                    ) as Record<MarketplaceCategory, string>}
                />
            </div>

        </section>
    );
}

export async function CustomerTestimonialsSection() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});

    return (
        <TestimonialsSection
            eyebrow={t('testimonials.eyebrow')}
            title={t('testimonials.title')}
            description={t('testimonials.description')}
            reviewerLabel={t('testimonials.reviewerLabel')}
            ratingLabel={t('testimonials.ratingLabel')}
        />
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
