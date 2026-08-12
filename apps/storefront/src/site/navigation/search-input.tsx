'use client';

import {SearchAutocomplete} from '@/features/search/search-autocomplete';

export function SearchInput({
    categories,
}: {
    categories: Array<{
        id: string;
        name: string;
        slug: string;
        children?: Array<{id: string; name: string; slug: string}> | null;
    }>;
}) {
    return <SearchAutocomplete categories={categories} />;
}
