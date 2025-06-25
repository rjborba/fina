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
import { Transactions } from '../../transactions/entities/transaction.entity';

@Index('categories_pkey', ['id'], { unique: true })
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

  @ManyToOne(() => Groups, (groups) => groups.categories)
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;

  @OneToMany(() => Transactions, (transactions) => transactions.category)
  transactions: Transactions[];

  constructor(data: Partial<Categories>) {
    Object.assign(this, data);
  }
}
