export interface SearchInputParams {
    term?: string;
    collectionSlug?: string;
    take: number;
    skip: number;
    groupByProduct: boolean;
    sort?: { name?: 'ASC' | 'DESC'; price?: 'ASC' | 'DESC' };
    facetValueFilters?: Array<{and?: string; or?: string[]}>;
    inStock?: boolean;
}

interface BuildSearchInputOptions {
    searchParams: { [key: string]: string | string[] | undefined };
    collectionSlug?: string;
}

export function buildSearchInput({ searchParams, collectionSlug }: BuildSearchInputOptions): SearchInputParams {
    const page = Number(searchParams.page) || 1;
    const take = 12;
    const skip = (page - 1) * take;
    const searchTerm = searchParams.q as string;
    const sort = (searchParams.sort as string) || (searchTerm ? 'relevance' : 'name-asc');

    // Extract facet value IDs from search params
    const facetTokens = searchParams.facets
        ? Array.isArray(searchParams.facets)
            ? searchParams.facets
            : [searchParams.facets]
        : [];

    // The URL stores `facetId:valueId`. Values selected inside one product facet
    // (e.g. S or M) are ORed; separate facets (e.g. Size and Colour) remain ANDed.
    // Bare IDs from older URLs are retained as individual AND filters.
    const groupedFacets = new Map<string, string[]>();
    const legacyFacetIds: string[] = [];
    for (const token of facetTokens) {
        const separator = token.indexOf(':');
        if (separator < 1) {
            legacyFacetIds.push(token);
            continue;
        }
        const groupId = token.slice(0, separator);
        const valueId = token.slice(separator + 1);
        if (!valueId) continue;
        groupedFacets.set(groupId, [...(groupedFacets.get(groupId) ?? []), valueId]);
    }

    const facetValueFilters: Array<{and?: string; or?: string[]}> = [
        ...legacyFacetIds.map(and => ({and})),
        ...Array.from(groupedFacets.values()).map(ids =>
            ids.length === 1 ? {and: ids[0]} : {or: ids},
        ),
    ];

    // Map sort parameter to Vendure SearchResultSortParameter
    const sortMapping: Record<string, { name?: 'ASC' | 'DESC'; price?: 'ASC' | 'DESC' }> = {
        'name-asc': { name: 'ASC' },
        'name-desc': { name: 'DESC' },
        'price-asc': { price: 'ASC' },
        'price-desc': { price: 'DESC' },
    };

    return {
        ...(searchTerm && { term: searchTerm }),
        ...(collectionSlug && { collectionSlug }),
        take,
        skip,
        groupByProduct: true,
        ...(sort !== 'relevance' && {sort: sortMapping[sort] || sortMapping['name-asc']}),
        ...(facetValueFilters.length > 0 && {facetValueFilters}),
        ...(searchParams.inStock === 'true' && {inStock: true}),
    };
}

export function getCurrentPage(searchParams: { [key: string]: string | string[] | undefined }): number {
    return Number(searchParams.page) || 1;
}
