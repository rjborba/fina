import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ImportMappingConfig } from '@fina/types';
import { Bankaccounts } from '../../bankaccounts/entities/bankaccount.entity';
import { Groups } from '../../groups/entities/group.entity';

@Entity('import_profiles', { schema: 'public' })
export class ImportProfiles {
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

  @Column('character', { name: 'source_fingerprint', length: 64 })
  sourceFingerprint: string;

  @Column('smallint', { name: 'config_version' })
  configVersion: number;

  @Column('jsonb', { name: 'mapping_config' })
  mappingConfig: ImportMappingConfig;

  @ManyToOne(() => Groups, {
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
}
