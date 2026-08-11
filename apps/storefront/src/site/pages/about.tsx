import type {Metadata} from 'next';
import {ContentPage, ContentSections, buildContentMetadata} from '@/site/pages/content-page';

export function generateMetadata(): Promise<Metadata> {
    return buildContentMetadata({key: 'about', path: '/about'});
}

export default function Page() {
    return (
        <ContentPage contentKey="about">
            <ContentSections contentKey="about" count={5} />
        </ContentPage>
    );
}
