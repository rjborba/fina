import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateGroupInputDto,
  GroupOutput,
  UpdateGroupReviewSettingsInput,
} from '@fina/types';
import { DataSource, Repository } from 'typeorm';
import { Groups } from './entities/group.entity';
import { UserGroup } from '../user-groups/entities/user-group.entity';
import { Users } from '../users/entities/user.entity';
import { AuthorizationService } from '../auth/authorization.service';
import { toDateTimeOutput } from '../common/date-output';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Groups)
    private readonly groups: Repository<Groups>,
    private readonly dataSource: DataSource,
    private readonly authorization: AuthorizationService,
  ) {}

  async create(
    userId: string,
    input: CreateGroupInputDto,
  ): Promise<GroupOutput> {
    return this.dataSource.transaction(async (manager) => {
      const userExists = await manager.getRepository(Users).exists({
        where: { id: userId },
      });
      if (!userExists) {
        throw new NotFoundException('Authenticated user profile not found');
      }
      const group = await manager.getRepository(Groups).save(
        manager.getRepository(Groups).create({
          name: input.name,
        }),
      );
      await manager.getRepository(UserGroup).save(
        manager.getRepository(UserGroup).create({
          group,
          user: { id: userId } as Users,
          role: 'owner',
        }),
      );
      return {
        id: group.id,
        createdAt: toDateTimeOutput(group.createdAt),
        name: group.name,
        isOwner: true,
        creditCardReviewMonthOffset: group.creditCardReviewMonthOffset,
      };
    });
  }

  async findAll(userId: string): Promise<GroupOutput[]> {
    const rows = await this.groups
      .createQueryBuilder('group_record')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .select('group_record.id', 'id')
      .addSelect('group_record.created_at', 'createdAt')
      .addSelect('group_record.name', 'name')
      .addSelect(
        'group_record.credit_card_review_month_offset',
        'creditCardReviewMonthOffset',
      )
      .addSelect("membership.role = 'owner'", 'isOwner')
      .orderBy('group_record.created_at', 'ASC')
      .getRawMany<GroupOutput>();
    return rows.map((row) => ({
      ...row,
      createdAt: toDateTimeOutput(row.createdAt),
      isOwner: Boolean(row.isOwner),
    }));
  }

  async findOne(userId: string, id: string): Promise<GroupOutput> {
    const row = await this.groups
      .createQueryBuilder('group_record')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .select('group_record.id', 'id')
      .addSelect('group_record.created_at', 'createdAt')
      .addSelect('group_record.name', 'name')
      .addSelect(
        'group_record.credit_card_review_month_offset',
        'creditCardReviewMonthOffset',
      )
      .addSelect("membership.role = 'owner'", 'isOwner')
      .where('group_record.id = :id', { id })
      .getRawOne<GroupOutput>();
    if (!row) throw new NotFoundException('Resource not found');
    return {
      ...row,
      createdAt: toDateTimeOutput(row.createdAt),
      isOwner: Boolean(row.isOwner),
    };
  }

  async updateReviewSettings(
    userId: string,
    id: string,
    input: UpdateGroupReviewSettingsInput,
  ): Promise<GroupOutput> {
    await this.authorization.assertOwner(userId, id);
    await this.groups.update(
      { id },
      { creditCardReviewMonthOffset: input.creditCardReviewMonthOffset },
    );
    return this.findOne(userId, id);
  }

  async remove(
    userId: string,
    id: string,
    confirmName: string,
  ): Promise<{ id: string }> {
    await this.authorization.assertOwner(userId, id);
    await this.dataSource.transaction(async (manager) => {
      const group = await manager.getRepository(Groups).findOne({
        where: { id },
      });
      if (!group || group.name !== confirmName) {
        throw new NotFoundException('Resource not found');
      }
      await manager.getRepository(Groups).delete({ id });
    });
    return { id };
  }
}
