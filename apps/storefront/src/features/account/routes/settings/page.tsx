import type {Metadata} from 'next';
import {ChevronRight, FileText, MapPin, ShieldCheck, UserRound} from 'lucide-react';
import {getTranslations} from 'next-intl/server';
import {StorefrontPageHeader} from '@/components/catalogue-page';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {AppearanceSettings} from './appearance-settings';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});
    return {title: t('settingsPageTitle')};
}

export default async function SettingsPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});

    const accountLinks = [
        {
            href: '/account/profile' as const,
            label: t('personalDetails'),
            description: t('personalDetailsDescription'),
            icon: UserRound,
        },
        {
            href: '/account/addresses' as const,
            label: t('savedAddresses'),
            description: t('savedAddressesDescription'),
            icon: MapPin,
        },
    ];

    return (
        <div className="space-y-6">
            <StorefrontPageHeader
                title={t('settings')}
                description={t('managePreferences')}
                variant="compact"
            />

            <Card>
                <CardHeader>
                    <CardTitle>{t('appearance')}</CardTitle>
                    <CardDescription>{t('appearanceDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <AppearanceSettings />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('accountAndSecurity')}</CardTitle>
                    <CardDescription>{t('accountAndSecurityDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                    {accountLinks.map(item => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group -mx-3 flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
                                    <Icon className="size-5" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-medium">{item.label}</span>
                                    <span className="block text-sm leading-relaxed text-muted-foreground">{item.description}</span>
                                </span>
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            </Link>
                        );
                    })}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('privacyAndTerms')}</CardTitle>
                    <CardDescription>{t('privacyAndTermsDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row">
                    <Button variant="outline" render={<Link href="/privacy" />}>
                        <ShieldCheck aria-hidden="true" />
                        {t('privacyPolicy')}
                    </Button>
                    <Button variant="outline" render={<Link href="/terms" />}>
                        <FileText aria-hidden="true" />
                        {t('termsOfService')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
