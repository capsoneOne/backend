import {MigrationInterface, QueryRunner} from 'typeorm';

/** Storefront contact form submissions. The DB is the system of record, not email. */
export class AddContactMessages1786020000000 implements MigrationInterface {
    name = 'AddContactMessages1786020000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "contact_message" (
                "id" SERIAL NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "name" character varying(120) NOT NULL,
                "email" character varying(255) NOT NULL,
                "topic" character varying(32) NOT NULL,
                "orderCode" character varying(64),
                "message" text NOT NULL,
                "customerId" integer,
                "status" character varying(16) NOT NULL DEFAULT 'new',
                "submitterHash" character varying(64) NOT NULL,
                CONSTRAINT "PK_contact_message" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_contact_message_status" ON "contact_message" ("status")
        `);
        // Rate limiting counts recent rows for one sender, so the lookup is
        // (hash, time) — an index on the hash alone would still scan their history.
        await queryRunner.query(`
            CREATE INDEX "IDX_contact_message_submitter"
            ON "contact_message" ("submitterHash", "createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_contact_message_submitter"`);
        await queryRunner.query(`DROP INDEX "IDX_contact_message_status"`);
        await queryRunner.query(`DROP TABLE "contact_message"`);
    }
}
