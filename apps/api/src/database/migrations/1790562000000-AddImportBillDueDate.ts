import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportBillDueDate1790562000000 implements MigrationInterface {
  name = 'AddImportBillDueDate1790562000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.imports
      ADD COLUMN bill_due_date date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.imports
      DROP COLUMN bill_due_date
    `);
  }
}
