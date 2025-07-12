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
import { Import } from '@fina/types';

@Index('imports_pkey', ['id'], { unique: true })
@Entity('imports', { schema: 'public' })
export class Imports implements Import {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('text', { name: 'fileName' })
  fileName: string;

  @ManyToOne(() => Groups, (groups) => groups.imports)
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;

  @OneToMany(() => Transactions, (transactions) => transactions.import, {
    cascade: ['insert'],
  })
  transactions: Transactions[];

  constructor(data: Omit<Imports, 'id' | 'createdAt'>) {
    Object.assign(this, data);
  }
}
