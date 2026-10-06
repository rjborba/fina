import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillTransactionGroups1790559700000
  implements MigrationInterface
{
  name = 'BackfillTransactionGroups1790559700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE public.transactions AS transaction_record
      SET group_id = account.group_id
      FROM public.bankaccounts AS account
      WHERE transaction_record.bankaccount_id = account.id
        AND transaction_record.group_id IS DISTINCT FROM account.group_id
    `);
  }

  public down(): Promise<void> {
    // The previous group value cannot be reconstructed after the correction.
    return Promise.resolve();
  }
}
