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
import { Bankaccounts } from '../../bankaccounts/entities/bankaccount.entity';
import { ImportMappingConfig } from '@fina/types';

@Entity('imports', { schema: 'public' })
export class Imports {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('text', { name: 'fileName' })
  fileName: string;

  @Column('boolean', { name: 'removed', default: false })
  removed: boolean;

  @Column('character', { name: 'file_hash', length: 64 })
  fileHash: string;

  @Column('bigint', { name: 'file_size' })
  fileSize: string;

  @Column('character', { name: 'source_fingerprint', length: 64 })
  sourceFingerprint: string;

  @Column('smallint', { name: 'config_version' })
  configVersion: number;

  @Column('jsonb', { name: 'mapping_config' })
  mappingConfig: ImportMappingConfig;

  @Column('integer', { name: 'transaction_count' })
  transactionCount: number;

  @Column('integer', { name: 'excluded_row_count' })
  excludedRowCount: number;

  @Column('date', { name: 'date_start', nullable: true })
  dateStart: Date | string | null;

  @Column('date', { name: 'date_end', nullable: true })
  dateEnd: Date | string | null;

  @Column('date', { name: 'bill_due_date', nullable: true })
  billDueDate: Date | string | null;

  @Column('double precision', { name: 'inflow_total' })
  inflowTotal: number;

  @Column('double precision', { name: 'outflow_total' })
  outflowTotal: number;

  @ManyToOne(() => Groups, (groups) => groups.imports, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;

  @ManyToOne(() => Bankaccounts, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'account_id', referencedColumnName: 'id' }])
  account: Bankaccounts;

  @OneToMany(() => Transactions, (transactions) => transactions.import, {
    cascade: ['insert'],
  })
  transactions: Transactions[];

  constructor(data: Partial<Imports>) {
    Object.assign(this, data);
  }
}
