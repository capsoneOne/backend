import type {Metadata} from 'next';
import {ContentPage, ContentSections, buildContentMetadata} from '@/site/pages/content-page';

export function generateMetadata(): Promise<Metadata> {
    return buildContentMetadata({key: 'shippingReturns', path: '/shipping-returns'});
}

export default function Page() {
    return (
        <ContentPage contentKey="shippingReturns">
            <ContentSections contentKey="shippingReturns" count={5} />
        </ContentPage>
    );
}
