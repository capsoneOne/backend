import type {Metadata} from 'next';
import {ContentPage, ContentSections, buildContentMetadata} from '@/site/pages/content-page';

export function generateMetadata(): Promise<Metadata> {
    return buildContentMetadata({key: 'contact', path: '/contact'});
}

export default function Page() {
    return (
        <ContentPage contentKey="contact">
            <ContentSections contentKey="contact" count={4} />
        </ContentPage>
    );
}
