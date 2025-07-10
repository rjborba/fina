import { Column, Entity, Index, OneToMany } from 'typeorm';
import { Bankaccounts } from '../../bankaccounts/entities/bankaccount.entity';
import { Groups } from '../../groups/entities/group.entity';
import { UserGroup } from '../../user-groups/entities/user-group.entity';
import { User } from '@fina/types';

@Index('users_pkey', ['id'], { unique: true })
@Entity('users', { schema: 'public' })
export class Users implements User {
  @Column('uuid', { primary: true, name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('text', { name: 'name', nullable: true })
  name: string | null;

  @Column('text', { name: 'email', nullable: true })
  email: string | null;

  @Column('jsonb', { name: 'meta_data', nullable: true })
  metaData: Record<string, unknown> | null;

  @Column('text', { name: 'avatar', nullable: true })
  avatar: string | null;

  @OneToMany(() => Bankaccounts, (bankaccounts) => bankaccounts.user)
  bankaccounts: Bankaccounts[];

  @OneToMany(() => Groups, (groups) => groups.creator)
  groups: Groups[];

  @OneToMany(() => UserGroup, (userGroup) => userGroup.user)
  userGroups: UserGroup[];
}
