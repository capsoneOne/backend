import { graphql } from '@/gql';

export const contactMessagesQuery = graphql(`
    query ContactMessages($options: ContactMessageListOptions) {
        contactMessages(options: $options) {
            totalItems
            items {
                id
                createdAt
                name
                email
                topic
                orderCode
                message
                customerId
                status
            }
        }
    }
`);

export const setContactMessageStatusMutation = graphql(`
    mutation SetContactMessageStatus($id: ID!, $status: String!) {
        setContactMessageStatus(id: $id, status: $status) {
            id
            status
        }
    }
`);
