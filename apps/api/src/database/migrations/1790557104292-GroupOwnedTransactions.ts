import { MigrationInterface, QueryRunner } from 'typeorm';

export class GroupOwnedTransactions1790557104292 implements MigrationInterface {
  name = 'GroupOwnedTransactions1790557104292';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.transactions
        DROP CONSTRAINT transactions_bankaccount_id_fkey,
        DROP CONSTRAINT transactions_import_id_fkey,
        DROP CONSTRAINT transactions_category_id_fkey,
        ALTER COLUMN bankaccount_id DROP NOT NULL,
        ADD CONSTRAINT transactions_bankaccount_id_fkey
          FOREIGN KEY (bankaccount_id) REFERENCES public.bankaccounts(id)
          ON UPDATE CASCADE ON DELETE SET NULL,
        ADD CONSTRAINT transactions_import_id_fkey
          FOREIGN KEY (import_id) REFERENCES public.imports(id)
          ON UPDATE CASCADE ON DELETE SET NULL,
        ADD CONSTRAINT transactions_category_id_fkey
          FOREIGN KEY (category_id) REFERENCES public.categories(id)
          ON UPDATE CASCADE ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX transactions_bankaccount_id_idx
      ON public.transactions (bankaccount_id)
    `);
    await queryRunner.query(`
      CREATE INDEX transactions_import_id_idx
      ON public.transactions (import_id)
    `);
    await queryRunner.query(`
      CREATE INDEX transactions_category_id_idx
      ON public.transactions (category_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX public.transactions_category_id_idx`);
    await queryRunner.query(`DROP INDEX public.transactions_import_id_idx`);
    await queryRunner.query(
      `DROP INDEX public.transactions_bankaccount_id_idx`,
    );
    await queryRunner.query(`
      ALTER TABLE public.transactions
        DROP CONSTRAINT transactions_category_id_fkey,
        DROP CONSTRAINT transactions_import_id_fkey,
        DROP CONSTRAINT transactions_bankaccount_id_fkey,
        ALTER COLUMN bankaccount_id SET NOT NULL,
        ADD CONSTRAINT transactions_category_id_fkey
          FOREIGN KEY (category_id) REFERENCES public.categories(id),
        ADD CONSTRAINT transactions_import_id_fkey
          FOREIGN KEY (import_id) REFERENCES public.imports(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        ADD CONSTRAINT transactions_bankaccount_id_fkey
          FOREIGN KEY (bankaccount_id) REFERENCES public.bankaccounts(id)
          ON UPDATE CASCADE ON DELETE CASCADE
    `);
  }
}
