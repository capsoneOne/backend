import gql from 'graphql-tag';

export const chatAssistantShopApiExtensions = gql`
    input ChatAssistantHistoryInput {
        role: String!
        content: String!
    }

    type ChatAssistantProduct {
        productId: ID!
        name: String!
        slug: String!
        priceWithTax: Int!
        currencyCode: String!
        inStock: Boolean!
    }

    type ChatAssistantSource {
        label: String!
        path: String!
        kind: String!
    }

    type ChatAssistantResult {
        answer: String!
        products: [ChatAssistantProduct!]!
        sources: [ChatAssistantSource!]!
    }

    extend type Mutation {
        "Ask the grounded StyleMatch shopping assistant."
        askChatAssistant(
            message: String!
            history: [ChatAssistantHistoryInput!]
            "Stable anonymous browser identifier. Ignored for signed-in customers."
            clientId: String
        ): ChatAssistantResult!
    }
`;
