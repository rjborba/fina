import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMonthlyReview1791000000000 implements MigrationInterface {
  name = 'AddMonthlyReview1791000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.groups
      ADD COLUMN credit_card_review_month_offset smallint NOT NULL DEFAULT 0,
      ADD CONSTRAINT groups_review_month_offset_check CHECK (credit_card_review_month_offset IN (0, -1))
    `);
    await queryRunner.query(`
      ALTER TABLE public.transactions ADD COLUMN review_month date,
      ADD COLUMN date_is_utc boolean NOT NULL DEFAULT false,
      ADD CONSTRAINT transactions_review_month_check CHECK (review_month = date_trunc('month', review_month)::date)
    `);
    await queryRunner.query(`
      CREATE TABLE public.credit_card_bill_reviews (
        group_id bigint NOT NULL REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE CASCADE,
        credit_account_id bigint NOT NULL,
        bill_month date NOT NULL,
        review_month date NOT NULL,
        PRIMARY KEY (group_id, credit_account_id, bill_month),
        CONSTRAINT credit_card_bill_reviews_account_group_fk FOREIGN KEY (credit_account_id, group_id)
          REFERENCES public.bankaccounts(id, group_id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT credit_card_bill_reviews_bill_month_check CHECK (bill_month = date_trunc('month', bill_month)::date),
        CONSTRAINT credit_card_bill_reviews_review_month_check CHECK (review_month = date_trunc('month', review_month)::date)
      )
    `);
    await queryRunner.query(`
      INSERT INTO public.credit_card_bill_reviews (group_id, credit_account_id, bill_month, review_month)
      SELECT DISTINCT transaction_record.group_id, account.id,
        date_trunc('month', transaction_record.credit_due_date)::date,
        date_trunc('month', transaction_record.credit_due_date)::date
      FROM public.transactions transaction_record
      INNER JOIN public.bankaccounts account ON account.id = transaction_record.bankaccount_id AND account.group_id = transaction_record.group_id
      WHERE account.type = 'credit' AND transaction_record.credit_due_date IS NOT NULL
    `);
    await queryRunner.query(
      `CREATE INDEX credit_card_bill_reviews_group_month_idx ON public.credit_card_bill_reviews (group_id, review_month, credit_account_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX transactions_group_review_month_idx ON public.transactions (group_id, review_month) WHERE removed IS NOT TRUE`,
    );
    await queryRunner.query(
      `ALTER TABLE public.credit_card_bill_reviews DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `REVOKE ALL PRIVILEGES ON public.credit_card_bill_reviews FROM PUBLIC, anon, authenticated, service_role`,
    );
    await queryRunner.query(`NOTIFY pgrst, 'reload schema'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE public.credit_card_bill_reviews`);
    await queryRunner.query(
      `DROP INDEX public.transactions_group_review_month_idx`,
    );
    await queryRunner.query(
      `ALTER TABLE public.transactions DROP CONSTRAINT transactions_review_month_check, DROP COLUMN review_month, DROP COLUMN date_is_utc`,
    );
    await queryRunner.query(
      `ALTER TABLE public.groups DROP CONSTRAINT groups_review_month_offset_check, DROP COLUMN credit_card_review_month_offset`,
    );
    await queryRunner.query(`NOTIFY pgrst, 'reload schema'`);
  }
}
