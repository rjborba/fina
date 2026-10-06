import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Groups } from '../../groups/entities/group.entity';
import { Transactions } from '../../transactions/entities/transaction.entity';
import type { CategoryColor, CategoryIcon } from '@fina/types';

@Entity('categories', { schema: 'public' })
export class Categories {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('text', { name: 'name' })
  name: string;

  @Column('text', { name: 'icon', default: 'tag' })
  icon: CategoryIcon;

  @Column('text', { name: 'color', default: 'yellow' })
  color: CategoryColor;

  @Column('boolean', { name: 'removed', default: false })
  removed: boolean;

  @ManyToOne(() => Groups, (groups) => groups.categories, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;

  @OneToMany(() => Transactions, (transactions) => transactions.category)
  transactions: Transactions[];

  constructor(data: Partial<Categories>) {
    Object.assign(this, data);
  }
}
