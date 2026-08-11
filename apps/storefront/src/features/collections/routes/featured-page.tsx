import type {Metadata} from 'next';
import {
    CollectionPageContent,
    generateCollectionMetadata,
} from '@/features/collections/routes/page';

export function generateMetadata(): Promise<Metadata> {
    return generateCollectionMetadata('featured');
}

export default function FeaturedPage({searchParams}: PageProps<'/[locale]/featured'>) {
    return <CollectionPageContent slug="featured" searchParams={searchParams} topLevel />;
}
