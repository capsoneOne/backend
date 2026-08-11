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
        <section className="border-b border-border bg-secondary/20">
            <div className="container mx-auto grid min-h-[39rem] items-center gap-10 px-4 pb-16 pt-24 lg:grid-cols-2 lg:gap-14 lg:pb-20 lg:pt-28">
                <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
                    <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.18em] text-primary">
                        {t('badge')}
                    </p>

                    <h1 className="animate-fade-up mt-5 text-balance text-5xl font-bold leading-[1.04] md:text-6xl [animation-delay:70ms]">
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
                            className="group h-12 rounded-lg px-6 text-base"
                        >
                            <ShoppingBag className="mr-2 size-4.5" />
                            {t('shopNow')}
                        </Button>
                        <Button
                            render={<Link href="/categories" />}
                            nativeButton={false}
                            variant="outline"
                            size="lg"
                            className="group h-12 rounded-lg bg-background px-6 text-base"
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

                <div className="animate-fade-up relative mx-auto w-full max-w-[32rem] [animation-delay:120ms]">
                    <div className="relative aspect-square rounded-xl border border-border bg-background/70 p-4">
                        <Image
                            src="/storyset/choosing-clothes-cuate.svg"
                            alt={t('illustrationAlt')}
                            width={500}
                            height={500}
                            priority
                            className="h-full w-full object-contain"
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
