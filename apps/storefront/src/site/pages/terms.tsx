import type {Metadata} from 'next';
import {ContentPage, ContentSections, buildContentMetadata} from '@/site/pages/content-page';

export function generateMetadata(): Promise<Metadata> {
    return buildContentMetadata({key: 'terms', path: '/terms'});
}

export default function Page() {
    return (
        <ContentPage contentKey="terms">
            <ContentSections contentKey="terms" count={6} />
        </ContentPage>
    );
}
