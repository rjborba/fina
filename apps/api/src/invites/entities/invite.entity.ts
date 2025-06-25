import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Groups } from '../../groups/entities/group.entity';

@Index('invites_email_key', ['email'], { unique: true })
@Index('invites_pkey', ['id'], { unique: true })
@Entity('invites', { schema: 'public' })
export class Invites {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('text', { name: 'email', unique: true })
  email: string;

  @Column('boolean', { name: 'pending' })
  pending: boolean;

  @ManyToOne(() => Groups, (groups) => groups.invites)
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;
}
