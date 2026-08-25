import { RequestContext, VendureEvent } from '@vendure/core';

/**
 * Published when a contact form submission is stored.
 *
 * The event carries the message rather than an id so a subscriber does not have to
 * read the contact tables — which is what keeps other plugins from depending on this
 * one's entity. The payload is immutable, so there is nothing to re-read.
 */
export class ContactMessageReceivedEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public message: {
            id: string | number;
            name: string;
            email: string;
            topic: string;
            orderCode: string | null;
            body: string;
        },
    ) {
        super();
    }
}
