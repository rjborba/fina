import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transactions } from '../../transactions/entities/transaction.entity';

@Entity('credit_card_bill_reconciliations', { schema: 'public' })
export class CreditCardBillReconciliations {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('timestamp with time zone', {
    name: 'updated_at',
    default: () => 'now()',
  })
  updatedAt: Date;

  @Column('bigint', { name: 'group_id' })
  groupId: string;

  @Column('bigint', { name: 'credit_account_id' })
  creditAccountId: string;

  @Column('date', { name: 'bill_month' })
  billMonth: Date | string;

  @OneToOne(
    () => Transactions,
    (transaction) => transaction.billPaymentReconciliation,
    { nullable: false, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  )
  @JoinColumn([{ name: 'payment_transaction_id', referencedColumnName: 'id' }])
  paymentTransaction: Transactions;

  @Column('numeric', {
    name: 'reconciled_bill_total',
    precision: 14,
    scale: 2,
  })
  reconciledBillTotal: string;

  constructor(data: Partial<CreditCardBillReconciliations>) {
    Object.assign(this, data);
  }
}
