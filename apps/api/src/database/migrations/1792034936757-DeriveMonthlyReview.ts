import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeriveMonthlyReview1792034936757 implements MigrationInterface {
  name = 'DeriveMonthlyReview1792034936757';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Review attribution is now derived from bill due dates or occurrence dates.
    // Drop only the obsolete assignments; retain every financial/source record
    // and the legacy timestamp interpretation marker added by Monthly Review.
    await queryRunner.query('DROP TABLE public.credit_card_bill_reviews');
    await queryRunner.query(
      'ALTER TABLE public.transactions DROP COLUMN review_month',
    );
    await queryRunner.query(
      'ALTER TABLE public.groups DROP COLUMN credit_card_review_month_offset',
    );
    await queryRunner.query("NOTIFY pgrst, 'reload schema'");
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'DeriveMonthlyReview is forward-only; removed review assignments cannot be reconstructed',
      ),
    );
  }
}
