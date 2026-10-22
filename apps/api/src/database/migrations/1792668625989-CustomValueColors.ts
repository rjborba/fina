import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomValueColors1792668625989 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.custom_values ADD COLUMN color text NOT NULL DEFAULT 'violet'
      CONSTRAINT custom_values_color_check CHECK (color IN (
        'yellow', 'lime', 'sky', 'violet', 'danger', 'amber',
        'orange', 'rose', 'pink', 'fuchsia', 'indigo', 'teal'
      ))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE public.custom_values DROP COLUMN color',
    );
  }
}
