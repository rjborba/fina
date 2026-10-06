import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Groups } from '../../groups/entities/group.entity';
import { Users } from '../../users/entities/user.entity';
import { Transactions } from '../../transactions/entities/transaction.entity';

@Entity('bankaccounts', { schema: 'public' })
export class Bankaccounts {
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

  @Column('smallint', { name: 'due_date', nullable: true })
  dueDate: number | null;

  @Column('boolean', { name: 'removed', default: false })
  removed: boolean;

  @ManyToOne(() => Groups, (groups) => groups.bankaccounts, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;

  @ManyToOne(() => Users, (users) => users.bankaccounts, { nullable: false })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: Users;

  @OneToMany(() => Transactions, (transactions) => transactions.bankaccount)
  transactions: Transactions[];

  constructor(bankaccount: Partial<Bankaccounts>) {
    Object.assign(this, bankaccount);
  }
}
