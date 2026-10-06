import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Groups } from '../../groups/entities/group.entity';

@Index('invites_group_id_email_key', ['group', 'email'], { unique: true })
@Entity('invites', { schema: 'public' })
export class Invites {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('text', { name: 'email' })
  email: string;

  @Column('boolean', { name: 'pending', default: true })
  pending: boolean;

  @ManyToOne(() => Groups, (groups) => groups.invites, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;
}
