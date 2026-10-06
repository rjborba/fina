import { Column, Entity, OneToMany } from 'typeorm';
import { Bankaccounts } from '../../bankaccounts/entities/bankaccount.entity';
import { UserGroup } from '../../user-groups/entities/user-group.entity';

@Entity('users', { schema: 'public' })
export class Users {
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

  @OneToMany(() => UserGroup, (userGroup) => userGroup.user)
  userGroups: UserGroup[];
}
