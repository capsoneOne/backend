import { graphql } from '@/gql';

export const embedderHealthQuery = graphql(`
    query VisualSearchEmbedderHealth {
        visualSearchEmbedderHealth {
            reachable
            status
            modelId
            revision
            embeddingDim
            expectedDim
            dimMatches
            normalized
            modalities
            sharedSpace
            pinned
            error
        }
    }
`);

export const indexStatusQuery = graphql(`
    query VisualSearchIndexStatus {
        visualSearchIndexStatus {
            revision
            modelId
            current
            stale
            products
        }
    }
`);

export const reindexMutation = graphql(`
    mutation ReindexVisualSearch($onlyMissing: Boolean) {
        reindexVisualSearch(onlyMissing: $onlyMissing)
    }
`);
