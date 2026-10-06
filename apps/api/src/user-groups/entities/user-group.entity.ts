import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Groups } from '../../groups/entities/group.entity';
import { Users } from '../../users/entities/user.entity';

@Entity('user_group', { schema: 'public' })
export class UserGroup {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('text', { name: 'role', default: 'member' })
  role: 'owner' | 'member';

  @ManyToOne(() => Groups, (groups: Groups) => groups.userGroups, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  group: Groups;

  @ManyToOne(() => Users, (users) => users.userGroups, { nullable: false })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: Users;

  constructor(data: Partial<UserGroup>) {
    Object.assign(this, data);
  }
}
