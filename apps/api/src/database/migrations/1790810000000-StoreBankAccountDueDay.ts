import { MigrationInterface, QueryRunner } from 'typeorm';

export class StoreBankAccountDueDay1790810000000 implements MigrationInterface {
  name = 'StoreBankAccountDueDay1790810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.bankaccounts
      ALTER COLUMN due_date TYPE smallint
      USING (
        CASE
          WHEN due_date IS NULL THEN NULL
          ELSE EXTRACT(DAY FROM due_date)::smallint
        END
      )
    `);
    await queryRunner.query(`
      ALTER TABLE public.bankaccounts
      ADD CONSTRAINT bankaccounts_due_date_day_check
      CHECK (due_date BETWEEN 1 AND 31)
    `);
    await queryRunner.query(`NOTIFY pgrst, 'reload schema'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.bankaccounts
      DROP CONSTRAINT bankaccounts_due_date_day_check
    `);
    await queryRunner.query(`
      ALTER TABLE public.bankaccounts
      ALTER COLUMN due_date TYPE date
      USING (
        CASE
          WHEN due_date IS NULL THEN NULL
          ELSE make_date(2000, 1, due_date::integer)
        END
      )
    `);
  }
}
