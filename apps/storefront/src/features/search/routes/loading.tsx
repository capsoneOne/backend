import { SearchTermSkeleton } from '@/features/search/routes/search-term';
import { SearchResultsSkeleton } from '@/features/search/components/search-results-skeleton';
import {StorefrontPageShell} from '@/components/catalogue-page';

export default function SearchLoading() {
    return (
        <StorefrontPageShell>
            <SearchTermSkeleton />
            <SearchResultsSkeleton />
        </StorefrontPageShell>
    );
}
