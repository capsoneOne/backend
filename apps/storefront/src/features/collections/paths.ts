/** Featured is a primary store destination; other collections remain nested. */
export function getCollectionPath(slug: string) {
    return slug === 'featured' ? '/featured' : `/collection/${slug}`;
}
