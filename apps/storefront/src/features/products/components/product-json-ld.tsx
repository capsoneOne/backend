import {buildCanonicalUrl, SITE_NAME, truncateDescription} from '@/config/metadata';

interface Variant {
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    stockLevel: string;
}

interface JsonLdProduct {
    name: string;
    slug: string;
    description?: string | null;
    assets: ReadonlyArray<{preview: string}>;
    variants: ReadonlyArray<Variant>;
}

/**
 * schema.org Product markup, so search engines can show price and availability
 * in results. Everything here already exists on the page — this only restates it
 * in a machine-readable form.
 *
 * Prices come back from Vendure in minor units (integer cents), which is why
 * every value is divided by 100 before it goes into the graph. Emitting the raw
 * integer is the classic way to advertise a $129 boot as $12,900.
 */
export function ProductJsonLd({
    product,
    currencyCode,
}: {
    product: JsonLdProduct;
    currencyCode: string;
}) {
    const url = buildCanonicalUrl(`/product/${product.slug}`);
    const inStock = product.variants.some(variant => variant.stockLevel !== 'OUT_OF_STOCK');
    const prices = product.variants.map(variant => variant.priceWithTax / 100);

    const offers =
        product.variants.length === 1
            ? {
                  '@type': 'Offer',
                  url,
                  priceCurrency: currencyCode,
                  price: prices[0].toFixed(2),
                  availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`,
                  itemCondition: 'https://schema.org/NewCondition',
              }
            : {
                  '@type': 'AggregateOffer',
                  url,
                  priceCurrency: currencyCode,
                  lowPrice: Math.min(...prices).toFixed(2),
                  highPrice: Math.max(...prices).toFixed(2),
                  offerCount: product.variants.length,
                  availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`,
              };

    const graph = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: truncateDescription(product.description, 300) || undefined,
        image: product.assets.map(asset => asset.preview),
        sku: product.variants[0]?.sku,
        url,
        brand: {'@type': 'Brand', name: SITE_NAME},
        offers,
    };

    return (
        <script
            type="application/ld+json"
            // The payload is built from our own typed data, never from user input.
            dangerouslySetInnerHTML={{__html: JSON.stringify(graph)}}
        />
    );
}

/**
 * Breadcrumb markup, mirroring the visible trail at the top of the page.
 */
export function BreadcrumbJsonLd({
    items,
}: {
    items: ReadonlyArray<{name: string; path: string}>;
}) {
    const graph = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: buildCanonicalUrl(item.path),
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{__html: JSON.stringify(graph)}}
        />
    );
}
