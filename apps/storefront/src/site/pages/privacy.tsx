import type {Metadata} from 'next';
import {ContentPage, ContentSections, buildContentMetadata} from '@/site/pages/content-page';

export function generateMetadata(): Promise<Metadata> {
    return buildContentMetadata({key: 'privacy', path: '/privacy'});
}

export default function Page() {
    return (
        <ContentPage contentKey="privacy">
            <ContentSections contentKey="privacy" count={6} />
        </ContentPage>
    );
}
