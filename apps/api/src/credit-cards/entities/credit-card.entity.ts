import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Groups } from '../../groups/entities/group.entity';
import { Bankaccounts } from '../../bankaccounts/entities/bankaccount.entity';

@Entity('credit_cards', { schema: 'public' })
export class CreditCards {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('text', { name: 'name' })
  name: string;

  @Column('text', { name: 'last4', nullable: true })
  last4: string | null;

  @Column('boolean', { name: 'archived', default: false })
  archived: boolean;

  @ManyToOne(() => Groups, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'group_id' })
  group: Groups;

  @ManyToOne(() => Bankaccounts, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: Bankaccounts;

  constructor(input: Partial<CreditCards>) {
    Object.assign(this, input);
  }
}
