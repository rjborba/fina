import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCreditCardBillAttribution1790900000000
  implements MigrationInterface
{
  name = 'RemoveCreditCardBillAttribution1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.groups
      DROP CONSTRAINT IF EXISTS groups_credit_card_bill_attribution_check,
      DROP COLUMN IF EXISTS credit_card_bill_attribution
    `);
    await queryRunner.query(`NOTIFY pgrst, 'reload schema'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.groups
      ADD COLUMN credit_card_bill_attribution text NOT NULL
        DEFAULT 'due-month',
      ADD CONSTRAINT groups_credit_card_bill_attribution_check
        CHECK (
          credit_card_bill_attribution IN ('due-month', 'previous-month')
        )
    `);
    await queryRunner.query(`NOTIFY pgrst, 'reload schema'`);
  }
}
