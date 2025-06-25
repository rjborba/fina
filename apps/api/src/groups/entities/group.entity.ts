import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Bankaccounts } from '../../bankaccounts/entities/bankaccount.entity';
import { Categories } from '../../categories/entities/category.entity';
import { Users } from '../../users/entities/user.entity';
import { Imports } from '../../imports/entities/import.entity';
import { Invites } from '../../invites/entities/invite.entity';
import { Transactions } from '../../transactions/entities/transaction.entity';
import { UserGroup } from '../../user-groups/entities/user-group.entity';

@Index('group_pkey', ['id'], { unique: true })
@Entity('groups', { schema: 'public' })
export class Groups {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('character varying', { name: 'name', nullable: false })
  name: string;

  @OneToMany(() => Bankaccounts, (bankaccounts) => bankaccounts.group)
  bankaccounts: Bankaccounts[];

  @OneToMany(() => Categories, (categories) => categories.group)
  categories: Categories[];

  @ManyToOne(() => Users, (users: Users) => users.groups)
  @JoinColumn([{ name: 'creator_id', referencedColumnName: 'id' }])
  creator: Users;

  @OneToMany(() => Imports, (imports) => imports.group)
  imports: Imports[];

  @OneToMany(() => Invites, (invites) => invites.group)
  invites: Invites[];

  @OneToMany(() => Transactions, (transactions) => transactions.group)
  transactions: Transactions[];

  @OneToMany(() => UserGroup, (userGroup) => userGroup.group)
  userGroups: UserGroup[];

  constructor(data: Partial<Groups>) {
    Object.assign(this, data);
  }
}
