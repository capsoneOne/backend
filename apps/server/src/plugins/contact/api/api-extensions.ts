import gql from 'graphql-tag';

/**
 * The mutation never reveals why a submission was rejected beyond a coarse code.
 * A form that says "you are rate limited" tells a bot exactly what to tune; the
 * storefront maps the code to human copy on its side.
 */
export const shopApiExtensions = gql`
    input SubmitContactMessageInput {
        name: String!
        email: String!
        "One of: order, product, other."
        topic: String!
        orderCode: String
        message: String!
    }

    type ContactMessageSubmission {
        success: Boolean!
        "Set only on failure: RATE_LIMITED or INVALID."
        errorCode: String
    }

    extend type Mutation {
        submitContactMessage(input: SubmitContactMessageInput!): ContactMessageSubmission!
    }
`;

export const adminApiExtensions = gql`
    type ContactMessage {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        email: String!
        topic: String!
        orderCode: String
        message: String!
        "Set when the sender was signed in at the time."
        customerId: ID
        "One of: new, read, archived."
        status: String!
    }

    type ContactMessageList {
        items: [ContactMessage!]!
        totalItems: Int!
    }

    input ContactMessageListOptions {
        skip: Int
        take: Int
        status: String
    }

    extend type Query {
        contactMessages(options: ContactMessageListOptions): ContactMessageList!
    }

    extend type Mutation {
        setContactMessageStatus(id: ID!, status: String!): ContactMessage!
    }
`;
