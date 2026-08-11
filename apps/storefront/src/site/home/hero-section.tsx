import Image from 'next/image';
import {ArrowRight, Check, LayoutGrid, ShoppingBag} from 'lucide-react';
import {getTranslations} from 'next-intl/server';

import {Button} from '@/components/ui/button';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';

export async function HeroSection() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Hero'});

    return (
        <section className="relative overflow-hidden border-b border-border bg-background">
            <div className="pointer-events-none absolute -right-40 top-10 size-[38rem] rounded-full bg-secondary/80 blur-3xl" />
            <div className="pointer-events-none absolute left-[8%] top-28 size-2 rounded-full bg-primary/50 animate-pulse-soft" />
            <div className="container mx-auto grid min-h-[43rem] items-center gap-10 px-4 pb-20 pt-28 lg:grid-cols-2 lg:gap-16 lg:pb-24 lg:pt-32">
                <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
                    <p className="animate-fade-up text-sm font-bold uppercase tracking-[0.18em] text-primary">
                        {t('badge')}
                    </p>

                    <h1 className="animate-fade-up mt-5 text-balance text-5xl font-bold leading-[1.02] md:text-6xl lg:text-7xl [animation-delay:70ms]">
                        {t('title')}{' '}
                        <span className="text-primary">{t('titleHighlight')}</span>
                    </h1>

                    <p className="animate-fade-up mx-auto mt-6 max-w-lg text-pretty text-lg font-light leading-relaxed text-muted-foreground lg:mx-0 [animation-delay:130ms]">
                        {t('subtitle')}
                    </p>

                    <div className="animate-fade-up mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start [animation-delay:190ms]">
                        <Button
                            render={<Link href="/search" />}
                            nativeButton={false}
                            size="lg"
                            className="group h-12 rounded-xl px-6 text-base elevate-1"
                        >
                            <ShoppingBag className="mr-2 size-4.5" />
                            {t('shopNow')}
                        </Button>
                        <Button
                            render={<Link href="/collections" />}
                            nativeButton={false}
                            variant="outline"
                            size="lg"
                            className="group h-12 rounded-xl bg-card px-6 text-base"
                        >
                            <LayoutGrid className="mr-2 size-4" />
                            {t('viewCollections')}
                            <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>

                    <p className="animate-fade-up mt-5 flex items-center justify-center gap-2 text-sm font-light text-muted-foreground lg:justify-start [animation-delay:250ms]">
                        <Check className="size-4 text-primary" />
                        {t('reassurance')}
                    </p>
                </div>

                <div className="animate-fade-up relative mx-auto w-full max-w-[35rem] [animation-delay:120ms]">
                    <div className="relative aspect-square">
                        <div className="absolute inset-[9%] rounded-full bg-secondary/75" />
                        <div className="animate-orbit-slow absolute inset-[4%] rounded-full border border-dashed border-primary/25">
                            <span className="absolute left-[10%] top-[8%] size-3 rounded-full bg-primary" />
                            <span className="absolute bottom-[4%] right-[18%] size-2 rounded-full bg-primary/60" />
                        </div>
                        <Image
                            src="/storyset/choosing-clothes-cuate.svg"
                            alt={t('illustrationAlt')}
                            width={500}
                            height={500}
                            priority
                            className="animate-float-art relative h-full w-full object-contain drop-shadow-[0_24px_32px_rgb(37_99_235/0.12)]"
                        />
                    </div>
                    <p className="mt-1 text-center text-xs text-muted-foreground">
                        <a
                            href="https://storyset.com/illustration/choosing-clothes/cuate"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                        >
                            {t('illustrationCredit')}
                        </a>
                    </p>
                </div>
            </div>
        </section>
    );
}
