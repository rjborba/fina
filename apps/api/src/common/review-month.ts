import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export function shiftReviewMonth(billMonth: string, offset: number): string {
  const date = new Date(`${billMonth}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

/** Call inside the same transaction as the purchase/import. The unique key and
 * row lock serialize concurrent bill creation and explicit reassignment. */
export async function ensureBillReviewMonth(
  manager: EntityManager,
  groupId: string,
  accountId: string,
  billMonth: string,
  explicitReviewMonth?: string,
): Promise<void> {
  await manager.query(
    `
    INSERT INTO public.credit_card_bill_reviews
      (group_id, credit_account_id, bill_month, review_month)
    SELECT group_record.id, account.id, $3::date,
      coalesce($4::date, ($3::date + group_record.credit_card_review_month_offset * interval '1 month')::date)
    FROM public.groups group_record
    INNER JOIN public.bankaccounts account ON account.group_id = group_record.id
    WHERE group_record.id = $1 AND account.id = $2 AND account.type = 'credit'
    ON CONFLICT (group_id, credit_account_id, bill_month) DO NOTHING
  `,
    [
      groupId,
      accountId,
      `${billMonth}-01`,
      explicitReviewMonth ? `${explicitReviewMonth}-01` : null,
    ],
  );
  const [saved] = await manager.query<{ review_month: string }[]>(
    `
    SELECT to_char(review_month, 'YYYY-MM') AS review_month
    FROM public.credit_card_bill_reviews
    WHERE group_id = $1 AND credit_account_id = $2 AND bill_month = $3::date
    FOR UPDATE
  `,
    [groupId, accountId, `${billMonth}-01`],
  );
  if (!saved) throw new NotFoundException('Resource not found');
  if (explicitReviewMonth && saved.review_month !== explicitReviewMonth) {
    throw new ConflictException({
      code: 'BILL_REVIEW_MONTH_CONFLICT',
      message:
        'This bill already belongs to another reference month. Change the reference month on the bill before adding these transactions.',
    });
  }
}
