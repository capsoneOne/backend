import {graphql} from '@/platform/vendure/graphql';

export const GetVisualSearchSourceProductQuery = graphql(`
    query GetVisualSearchSourceProduct($id: ID!) {
        product(id: $id) {
            id
            name
            featuredAsset {
                id
                preview
            }
            assets {
                id
                preview
            }
            variants {
                assets {
                    id
                    preview
                }
            }
        }
    }
`);
