import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Bankaccounts } from '../../bankaccounts/entities/bankaccount.entity';
import { Categories } from '../../categories/entities/category.entity';
import { Groups } from '../../groups/entities/group.entity';
import { Imports } from '../../imports/entities/import.entity';
import { Transaction } from '@fina/types';

@Index('transactions_pkey', ['id'], { unique: true })
@Entity('transactions', { schema: 'public' })
export class Transactions implements Transaction {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('character varying', { name: 'description', nullable: true })
  description: string | null;

  @Column('real', { name: 'value', nullable: true, precision: 24 })
  value: number | null;

  @Column('timestamp without time zone', { name: 'date', nullable: true })
  date: Date | null;

  @Column('integer', { name: 'installment_total', nullable: true })
  installmentTotal?: number | null;

  @Column('bigint', { name: 'installment_current', nullable: true })
  installmentCurrent?: string | null;

  @Column('date', { name: 'credit_due_date', nullable: true })
  creditDueDate?: string | null;

  @Column('text', { name: 'observation', nullable: true })
  observation?: string | null;

  @Column('boolean', {
    name: 'removed',
    nullable: true,
    default: () => 'false',
  })
  removed?: boolean | null;

  @Column('date', { name: 'to_be_considered_at', nullable: true })
  toBeConsideredAt?: string | null;

  @Column('date', { name: 'calculated_date', nullable: true })
  calculatedDate?: Date | null;

  @ManyToOne(() => Bankaccounts, (bankaccounts) => bankaccounts.transactions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'bankaccount_id', referencedColumnName: 'id' }])
  bankaccount: Bankaccounts;

  @ManyToOne(() => Categories, (categories) => categories.transactions)
  @JoinColumn([{ name: 'category_id', referencedColumnName: 'id' }])
  category?: Categories | null;

  @ManyToOne(() => Groups, (groups) => groups.transactions)
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;

  @ManyToOne(() => Imports, (imports) => imports.transactions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'import_id', referencedColumnName: 'id' }])
  import: Imports;

  constructor(transaction: Omit<Transaction, 'id' | 'createdAt'>) {
    Object.assign(this, transaction);
  }
}
