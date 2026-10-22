import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptionalCustomValueColor1792702564234
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.custom_values
        ALTER COLUMN color DROP NOT NULL,
        ALTER COLUMN color DROP DEFAULT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // The preceding schema cannot represent an unset color.
    await queryRunner.query(
      "UPDATE public.custom_values SET color = 'violet' WHERE color IS NULL",
    );
    await queryRunner.query(`
      ALTER TABLE public.custom_values
        ALTER COLUMN color SET DEFAULT 'violet',
        ALTER COLUMN color SET NOT NULL
    `);
  }
}
