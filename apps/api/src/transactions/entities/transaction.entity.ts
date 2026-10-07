import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Bankaccounts } from '../../bankaccounts/entities/bankaccount.entity';
import { Categories } from '../../categories/entities/category.entity';
import { Groups } from '../../groups/entities/group.entity';
import { Imports } from '../../imports/entities/import.entity';
import { CreditCardBillReconciliations } from '../../credit-card-bills/entities/credit-card-bill-reconciliation.entity';
import { CreditCardBillReviews } from '../../credit-card-bills/entities/credit-card-bill-review.entity';

@Entity('transactions', { schema: 'public' })
export class Transactions {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('character varying', { name: 'description', nullable: true })
  description: string | null;

  @Column('real', { name: 'value', nullable: true })
  value: number | null;

  @Column('timestamp without time zone', {
    name: 'date',
    nullable: true,
  })
  date: Date | string | null;

  @Column('boolean', { name: 'date_is_utc', default: false })
  dateIsUtc: boolean;

  @Column('integer', { name: 'installment_total', nullable: true })
  installmentTotal?: number | null;

  @Column('bigint', { name: 'installment_current', nullable: true })
  installmentCurrent?: string | null;

  @Column('date', { name: 'credit_due_date', nullable: true })
  creditDueDate?: Date | string | null;

  @Column('text', { name: 'observation', nullable: true })
  observation?: string | null;

  @Column('boolean', {
    name: 'removed',
    default: () => 'false',
  })
  removed: boolean;

  @Column('date', { name: 'to_be_considered_at', nullable: true })
  toBeConsideredAt?: Date | string | null;

  @Column('date', { name: 'calculated_date', nullable: true })
  calculatedDate?: Date | string | null;

  @Column('integer', { name: 'source_row', nullable: true })
  sourceRow?: number | null;

  @Column('date', { name: 'review_month', nullable: true })
  reviewMonth?: Date | string | null;

  billReview?: CreditCardBillReviews | null;
  billCashFlowPayment?: Transactions | null;

  @ManyToOne(() => Bankaccounts, (bankaccounts) => bankaccounts.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'bankaccount_id', referencedColumnName: 'id' }])
  bankaccount: Bankaccounts | null;

  @ManyToOne(() => Categories, (categories) => categories.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'category_id', referencedColumnName: 'id' }])
  category?: Categories | null;

  @ManyToOne(() => Groups, (groups) => groups.transactions, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;

  @ManyToOne(() => Imports, (imports) => imports.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'import_id', referencedColumnName: 'id' }])
  import?: Imports | null;

  @OneToOne(
    () => CreditCardBillReconciliations,
    (reconciliation) => reconciliation.paymentTransaction,
  )
  billPaymentReconciliation?: CreditCardBillReconciliations | null;

  constructor(transaction: Partial<Transactions>) {
    Object.assign(this, transaction);
  }
}
