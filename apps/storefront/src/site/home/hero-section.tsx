import Image from 'next/image';
import {ArrowRight, Check, LayoutGrid, ScanSearch, ShoppingBag} from 'lucide-react';
import {getTranslations} from 'next-intl/server';

import {Button} from '@/components/ui/button';
import {StorefrontHero, StorefrontHeroHeading} from '@/components/storefront-hero';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';

export async function HeroSection() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Hero'});

    return (
        <StorefrontHero
            artwork={(
                <Image
                    src="/storyset/ecommerce-web-page-cuate.svg"
                    alt={t('illustrationAlt')}
                    width={750}
                    height={500}
                    priority
                    className="h-auto w-full object-contain lg:scale-[1.14]"
                />
            )}
        >
            <StorefrontHeroHeading
                eyebrow={t('badge')}
                title={(
                    <>
                        {t('title')}{' '}
                        <span className="text-primary">{t('titleHighlight')}</span>
                    </>
                )}
                description={t('subtitle')}
            />

            <div className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row [animation-delay:180ms]">
                <Button
                    render={<Link href="/search" />}
                    nativeButton={false}
                    size="lg"
                    className="group h-12 rounded-lg px-6 text-base"
                >
                    <ShoppingBag className="mr-1 size-4.5" aria-hidden="true" />
                    {t('shopNow')}
                    <ArrowRight className="ml-1 size-4 transition-transform group-hover/button:translate-x-1" aria-hidden="true" />
                </Button>
                <Button
                    render={<Link href="/visual-search" />}
                    nativeButton={false}
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-lg bg-background px-6 text-base"
                >
                    <ScanSearch className="mr-1 size-4.5 text-primary" aria-hidden="true" />
                    {t('searchByImage')}
                </Button>
            </div>

            <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground [animation-delay:240ms]">
                <p className="flex items-center gap-2 font-light">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" aria-hidden="true" />
                    </span>
                    {t('reassurance')}
                </p>
                <Link href="/categories" className="group inline-flex min-h-11 items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary">
                    <LayoutGrid className="size-4" aria-hidden="true" />
                    {t('viewCollections')}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
            </div>
        </StorefrontHero>
    );
}
