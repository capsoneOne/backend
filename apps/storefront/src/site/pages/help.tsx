import type {Metadata} from 'next';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {ContentPage, buildContentMetadata} from '@/site/pages/content-page';
import {buildCanonicalUrl} from '@/config/metadata';

const FAQ_COUNT = 8;

export function generateMetadata(): Promise<Metadata> {
    return buildContentMetadata({key: 'help', path: '/help'});
}

export default async function HelpPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Pages'});

    const entries = Array.from({length: FAQ_COUNT}).map((_, index) => ({
        question: t(`help.faq.${index}.question`),
        answer: t(`help.faq.${index}.answer`),
    }));

    // FAQPage markup makes these eligible for expandable results in search.
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        url: buildCanonicalUrl('/help'),
        mainEntity: entries.map(entry => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: {'@type': 'Answer', text: entry.answer},
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(faqJsonLd)}}
            />
            <ContentPage contentKey="help">
                <Accordion className="w-full">
                    {entries.map((entry, index) => (
                        <AccordionItem key={index} value={`faq-${index}`}>
                            <AccordionTrigger className="text-left">{entry.question}</AccordionTrigger>
                            <AccordionContent className="font-light leading-relaxed text-muted-foreground">
                                {entry.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </ContentPage>
        </>
    );
}
