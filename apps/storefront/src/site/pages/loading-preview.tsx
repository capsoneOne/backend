import {StorefrontLoadingIndicator} from '@/components/storefront-loading-indicator';
import {notFound} from 'next/navigation';

export default function LoadingPreview() {
    if (process.env.NODE_ENV !== 'development') {
        notFound();
    }

    return <StorefrontLoadingIndicator />;
}
