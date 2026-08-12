import {MigrationInterface, QueryRunner} from 'typeorm';

/** Stores only the key of a curated storefront avatar, never an arbitrary URL. */
export class AddCustomerAvatar1786010000000 implements MigrationInterface {
    name = 'AddCustomerAvatar1786010000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "customer" ADD "customFieldsAvatarkey" character varying(32)`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "customer" DROP COLUMN "customFieldsAvatarkey"`,
        );
    }
}
