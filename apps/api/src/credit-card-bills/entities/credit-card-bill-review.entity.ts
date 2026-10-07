import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('credit_card_bill_reviews', { schema: 'public' })
export class CreditCardBillReviews {
  @PrimaryColumn('bigint', { name: 'group_id' })
  groupId: string;

  @PrimaryColumn('bigint', { name: 'credit_account_id' })
  creditAccountId: string;

  @PrimaryColumn('date', { name: 'bill_month' })
  billMonth: string;

  @Column('date', { name: 'review_month' })
  reviewMonth: string;
}
