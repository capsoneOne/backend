import {graphql} from '@/platform/vendure/graphql';

export const SubmitContactMessageMutation = graphql(`
    mutation SubmitContactMessage($input: SubmitContactMessageInput!) {
        submitContactMessage(input: $input) {
            success
            errorCode
        }
    }
`);
