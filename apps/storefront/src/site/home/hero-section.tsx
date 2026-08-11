import Image from 'next/image';
import {ArrowRight, Check, LayoutGrid, ScanSearch, ShoppingBag} from 'lucide-react';
import {getTranslations} from 'next-intl/server';

import {Button} from '@/components/ui/button';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';

export async function HeroSection() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Hero'});

    return (
        <section className="relative isolate overflow-hidden border-b border-border/70 pt-[4.5rem]">
            <div aria-hidden="true" className="absolute -left-32 top-24 size-96 rounded-full bg-primary/10 blur-3xl" />
            <div aria-hidden="true" className="absolute -right-20 bottom-0 size-[28rem] rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="container mx-auto px-4 py-6 md:py-8 lg:py-10">
                <div className="animate-page-enter relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 shadow-[var(--shadow-e3)] backdrop-blur-xl">
                    <div aria-hidden="true" className="bg-dotfield absolute inset-0 opacity-40 [mask-image:linear-gradient(90deg,black,transparent_72%)]" />

                    <div className="relative grid lg:grid-cols-[.92fr_1.08fr]">
                        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 md:py-14 lg:px-14 lg:py-16 xl:px-16">
                            <div className="animate-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                <span className="size-1.5 rounded-full bg-primary shadow-[0_0_0_4px_color-mix(in_oklch,var(--color-primary)_15%,transparent)]" />
                                {t('badge')}
                            </div>

                            <h1 className="animate-fade-up mt-6 max-w-2xl text-balance text-4xl font-bold leading-[1.04] md:text-5xl xl:text-6xl [animation-delay:70ms]">
                                {t('title')}{' '}
                                <span className="text-primary">{t('titleHighlight')}</span>
                            </h1>

                            <p className="animate-fade-up mt-6 max-w-xl text-pretty text-base font-light leading-relaxed text-muted-foreground md:text-lg [animation-delay:130ms]">
                                {t('subtitle')}
                            </p>

                            <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row [animation-delay:190ms]">
                                <Button
                                    render={<Link href="/search" />}
                                    nativeButton={false}
                                    size="lg"
                                    className="group h-12 rounded-xl px-6 text-base"
                                >
                                    <ShoppingBag className="mr-1 size-4.5" />
                                    {t('shopNow')}
                                    <ArrowRight className="ml-1 size-4 transition-transform group-hover/button:translate-x-1" />
                                </Button>
                                <Button
                                    render={<Link href="/visual-search" />}
                                    nativeButton={false}
                                    variant="outline"
                                    size="lg"
                                    className="h-12 rounded-xl bg-background/70 px-6 text-base backdrop-blur-sm"
                                >
                                    <ScanSearch className="mr-1 size-4.5 text-primary" />
                                    {t('searchByImage')}
                                </Button>
                            </div>

                            <div className="animate-fade-up mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-foreground [animation-delay:250ms]">
                                <p className="flex items-center gap-2 font-light">
                                    <Check className="size-4 text-primary" />
                                    {t('reassurance')}
                                </p>
                                <Link href="/categories" className="group inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary">
                                    <LayoutGrid className="size-4" />
                                    {t('viewCollections')}
                                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </div>
                        </div>

                        <div className="relative min-h-[22rem] overflow-hidden border-t border-border/60 bg-gradient-to-br from-primary/5 via-secondary/40 to-cyan-400/10 sm:min-h-[28rem] lg:min-h-[38rem] lg:border-l lg:border-t-0">
                            <div aria-hidden="true" className="animate-orbit-slow absolute left-1/2 top-1/2 size-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/25" />
                            <div className="absolute inset-5 flex items-center justify-center sm:inset-8 lg:inset-10">
                                <Image
                                    src="/storyset/ecommerce-web-page-cuate.svg"
                                    alt={t('illustrationAlt')}
                                    width={750}
                                    height={500}
                                    priority
                                    className="animate-float-art h-full w-full object-contain drop-shadow-2xl"
                                />
                            </div>
                            <span aria-hidden="true" className="animate-scan-art absolute inset-x-[12%] top-8 h-px bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_18px_var(--color-primary)]" />
                            <a
                                href="https://storyset.com/illustration/ecommerce-web-page/cuate"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-4 right-5 rounded-full bg-background/80 px-3 py-1.5 text-[0.6875rem] text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
                            >
                                {t('illustrationCredit')}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
