import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Groups } from '../../groups/entities/group.entity';
import type { CategoryColor } from '@fina/types';

@Entity('custom_values', { schema: 'public' })
export class CustomValues {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column('text')
  title: string;

  @Column('text', { default: 'violet' })
  color: CategoryColor;

  @Column('text', { name: 'resolved_expression' })
  resolvedExpression: string;

  @ManyToOne(() => Groups, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Groups;
}
