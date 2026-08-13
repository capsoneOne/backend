import {MigrationInterface, QueryRunner} from 'typeorm';

/** Persistent, privacy-preserving usage accounting for the RAG chat assistant. */
export class AddChatAssistantQuotas1786000000000 implements MigrationInterface {
    name = 'AddChatAssistantQuotas1786000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "chat_assistant_usage_bucket" (
                "identifierHash" character varying(64) NOT NULL,
                "scope" character varying(24) NOT NULL,
                "windowStart" TIMESTAMP WITH TIME ZONE NOT NULL,
                "requestCount" integer NOT NULL DEFAULT 0,
                "inputTokens" bigint NOT NULL DEFAULT 0,
                "outputTokens" bigint NOT NULL DEFAULT 0,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_chat_assistant_usage_bucket"
                    PRIMARY KEY ("identifierHash", "scope", "windowStart")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_chat_usage_window"
            ON "chat_assistant_usage_bucket" ("windowStart")
        `);

        await queryRunner.query(`
            CREATE TABLE "chat_assistant_request_lease" (
                "id" uuid NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_chat_assistant_request_lease" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_chat_lease_expiry"
            ON "chat_assistant_request_lease" ("expiresAt")
        `);

        await queryRunner.query(`
            CREATE TABLE "chat_assistant_usage_event" (
                "id" BIGSERIAL NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "identifierHash" character varying(64) NOT NULL,
                "authenticated" boolean NOT NULL,
                "model" character varying(128) NOT NULL,
                "success" boolean NOT NULL,
                "errorCode" character varying(64),
                "inputTokens" integer NOT NULL DEFAULT 0,
                "outputTokens" integer NOT NULL DEFAULT 0,
                "latencyMs" integer NOT NULL,
                CONSTRAINT "PK_chat_assistant_usage_event" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_chat_usage_event_created"
            ON "chat_assistant_usage_event" ("createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_chat_usage_event_identifier"
            ON "chat_assistant_usage_event" ("identifierHash", "createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "chat_assistant_usage_event"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "chat_assistant_request_lease"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "chat_assistant_usage_bucket"`);
    }
}

