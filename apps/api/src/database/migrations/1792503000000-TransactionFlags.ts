import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionFlags1792503000000 implements MigrationInterface {
  name = 'TransactionFlags1792503000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE public.transactions ADD COLUMN flagged boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE public.transactions DROP COLUMN flagged`,
    );
  }
}
