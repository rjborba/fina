import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Groups } from '../../groups/entities/group.entity';
import { Users } from '../../users/entities/user.entity';
import { Transactions } from '../../transactions/entities/transaction.entity';
import { Bankaccount } from '@fina/types';

@Index('accounts_pkey', ['id'], { unique: true })
@Entity('bankaccounts', { schema: 'public' })
export class Bankaccounts implements Bankaccount {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('text', { name: 'name', nullable: false })
  name: string;

  @Column('text', { name: 'type', nullable: false })
  type: string;

  @Column('date', { name: 'due_date', nullable: true })
  dueDate: Date | null;

  @ManyToOne(() => Groups, (groups) => groups.bankaccounts)
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;

  @ManyToOne(() => Users, (users) => users.bankaccounts)
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: Users;

  @OneToMany(() => Transactions, (transactions) => transactions.bankaccount)
  transactions: Transactions[];

  constructor(
    bankaccount: Omit<Bankaccounts, 'id' | 'createdAt' | 'transactions'>,
  ) {
    Object.assign(this, bankaccount);
  }
}
