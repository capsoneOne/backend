import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

export type ContactMessageStatus = 'new' | 'read' | 'archived';

/**
 * A message sent from the storefront contact form.
 *
 * The database is the system of record here, not email. The EmailPlugin runs with
 * `devMode: true` (vendure-config.ts), so nothing is actually delivered — a form
 * that only emailed would drop every message on the floor while telling the sender
 * it had been sent. Notification can be layered on later; the row is what makes the
 * message recoverable in the meantime.
 */
@Entity()
export class ContactMessage extends VendureEntity {
    constructor(input?: DeepPartial<ContactMessage>) {
        super(input);
    }

    @Column({ length: 120 })
    name: string;

    @Column({ length: 255 })
    email: string;

    /** Which of the contact page's stated topics this is about. */
    @Column({ length: 32 })
    topic: string;

    /** The page's copy asks for an order code; capturing it structurally beats prose. */
    @Column({ type: 'varchar', length: 64, nullable: true })
    orderCode: string | null;

    @Column({ type: 'text' })
    message: string;

    /**
     * Set when the sender was signed in. Not a foreign key: a message must outlive
     * the account that sent it, otherwise deleting a customer destroys the record of
     * a complaint they made.
     */
    @EntityId({ nullable: true })
    customerId: ID | null;

    @Index()
    @Column({ length: 16, default: 'new' })
    status: ContactMessageStatus;

    /**
     * Salted hash of the sender's IP, used only to rate-limit. Storing the address
     * itself would make this table a log of who visited from where, which is not
     * something a contact form needs to know.
     */
    @Index()
    @Column({ length: 64 })
    submitterHash: string;
}
