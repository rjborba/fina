import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupMember } from '@fina/types';
import { Repository } from 'typeorm';
import { AuthorizationService } from '../auth/authorization.service';
import { UserGroup } from './entities/user-group.entity';
import { toDateTimeOutput } from '../common/date-output';

@Injectable()
export class UserGroupsService {
  constructor(
    @InjectRepository(UserGroup)
    private readonly memberships: Repository<UserGroup>,
    private readonly authorization: AuthorizationService,
  ) {}

  async findAll(userId: string, groupId: string): Promise<GroupMember[]> {
    await this.authorization.assertMember(userId, groupId);
    const members = await this.memberships
      .createQueryBuilder('membership')
      .innerJoin('membership.user', 'member')
      .innerJoin('membership.group', 'group_record')
      .innerJoin(
        'group_record.userGroups',
        'requester_membership',
        'requester_membership.user_id = :userId',
        { userId },
      )
      .select('membership.id', 'membershipId')
      .addSelect('membership.created_at', 'joinedAt')
      .addSelect('membership.role', 'role')
      .addSelect('member.id', 'userId')
      .addSelect('member.name', 'name')
      .addSelect('member.email', 'email')
      .addSelect('member.avatar', 'avatar')
      .where('membership.group_id = :groupId', { groupId })
      .orderBy('membership.created_at', 'ASC')
      .getRawMany<GroupMember>();
    return members.map((member) => ({
      ...member,
      joinedAt: toDateTimeOutput(member.joinedAt),
    }));
  }
}
