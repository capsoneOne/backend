import type {Metadata, Viewport} from "next";
import {locale as rootLocale} from "next/root-params";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {Kantumruy_Pro, Ubuntu, Ubuntu_Mono} from "next/font/google";
import {getMessages, getTranslations, setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";
import {routing} from "@/platform/i18n/routing";
import {toOgLocale} from "@/platform/i18n/locale-utils";
import {getRouteLocale} from "@/platform/i18n/server";
import {Toaster} from "@/components/ui/sonner";
import {Navbar} from '@/site/navigation/navbar';
import {Footer} from "@/site/footer";
import {ThemeProvider} from "@/site/providers/theme-provider";
import {WishlistProvider} from "@/features/wishlist/wishlist-context";
import {SITE_NAME, SITE_URL} from "@/config/metadata";
import {ChatAssistant} from '@/site/chat-assistant/chat-assistant';

// Locale messages and shared storefront chrome resolve at request time. Until
// they move behind smaller streaming boundaries, this layout is intentionally
// allowed to block instead of failing Next.js static-shell validation.
export const instant = false;

// Ubuntu has no 600. Loading 300/400/500/700 explicitly keeps the browser from
// synthesising a semibold, which is what makes Ubuntu look smeared in headings.
const ubuntu = Ubuntu({
    variable: "--font-ubuntu",
    subsets: ["latin"],
    weight: ["300", "400", "500", "700"],
    display: "swap",
});

const ubuntuMono = Ubuntu_Mono({
    variable: "--font-ubuntu-mono",
    subsets: ["latin"],
    weight: ["400", "700"],
    display: "swap",
});

const kantumruyPro = Kantumruy_Pro({
    variable: "--font-kantumruy",
    subsets: ["khmer"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

export function generateStaticParams() {
    return routing.locales.map((locale) => ({locale}));
}

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const ogLocale = toOgLocale(locale);
    const t = await getTranslations({locale, namespace: 'Common'});

    return {
        metadataBase: new URL(SITE_URL),
        title: {
            default: SITE_NAME,
            template: `%s | ${SITE_NAME}`,
        },
        description: t('siteDescription', {siteName: SITE_NAME}),
        openGraph: {
            type: "website",
            siteName: SITE_NAME,
            locale: ogLocale,
        },
        twitter: {
            card: "summary_large_image",
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-video-preview": -1,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        },
        alternates: {
            languages: Object.fromEntries(
                routing.locales.map((l) => [l, `/${l}`])
            ),
        },
    };
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
        // Matches --background in globals.css for each scheme, so the mobile browser
        // chrome blends into the page instead of framing it in plain black/white.
        {media: "(prefers-color-scheme: light)", color: "#f8faff"},
        {media: "(prefers-color-scheme: dark)", color: "#0c1324"},
    ],
};

export default async function LocaleLayout({children}: {children: React.ReactNode}) {
    const locale = await rootLocale();

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    setRequestLocale(locale);
    const messages = await getMessages({locale});
    const t = await getTranslations({locale, namespace: 'Common'});

    return (
        <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
            <body
                className={`${ubuntu.variable} ${ubuntuMono.variable} ${kantumruyPro.variable} font-sans antialiased flex min-h-screen flex-col`}
            >
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <ThemeProvider>
                        <WishlistProvider>
                            <a
                                href="#main-content"
                                className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-background px-4 py-3 font-medium text-foreground shadow-lg outline-none transition-transform focus:translate-y-0 focus:ring-2 focus:ring-ring"
                            >
                                {t('skipToContent')}
                            </a>
                            <Navbar />
                            <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
                                {children}
                            </main>
                            <Footer/>
                            <ChatAssistant/>
                            <Toaster/>
                        </WishlistProvider>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
