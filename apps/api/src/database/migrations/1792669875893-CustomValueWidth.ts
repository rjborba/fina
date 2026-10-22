import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomValueWidth1792669875893 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.custom_values ADD COLUMN column_span smallint NOT NULL DEFAULT 1
      CONSTRAINT custom_values_column_span_check CHECK (column_span IN (1, 2))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE public.custom_values DROP COLUMN column_span',
    );
  }
}
