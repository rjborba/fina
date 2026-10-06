import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateInviteInputDto, InviteOutput } from '@fina/types';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { AuthorizationService } from '../auth/authorization.service';
import { Groups } from '../groups/entities/group.entity';
import { Users } from '../users/entities/user.entity';
import { Invites } from './entities/invite.entity';
import { toDateTimeOutput } from '../common/date-output';

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invites)
    private readonly invites: Repository<Invites>,
    private readonly dataSource: DataSource,
    private readonly authorization: AuthorizationService,
  ) {}

  async create(
    userId: string,
    input: CreateInviteInputDto,
  ): Promise<InviteOutput> {
    await this.authorization.assertOwner(userId, input.groupId);
    try {
      const invite = await this.invites.save(
        this.invites.create({
          email: input.email,
          pending: true,
          group: { id: input.groupId } as Groups,
        }),
      );
      const group = await this.invites.manager
        .getRepository(Groups)
        .findOneByOrFail({
          id: input.groupId,
        });
      return this.toOutput(invite, group);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('An invitation already exists');
      }
      throw error;
    }
  }

  async findAll(userId: string, groupId: string): Promise<InviteOutput[]> {
    await this.authorization.assertOwner(userId, groupId);
    const invites = await this.queryOutputs()
      .innerJoin(
        'group_record.userGroups',
        'membership',
        "membership.user_id = :userId AND membership.role = 'owner'",
        { userId },
      )
      .where('invite.group_id = :groupId', { groupId })
      .andWhere('invite.pending = true')
      .orderBy('invite.created_at', 'ASC')
      .getRawMany<InviteOutput>();
    return invites.map((invite) => ({
      ...invite,
      createdAt: toDateTimeOutput(invite.createdAt),
    }));
  }

  async findMine(email?: string): Promise<InviteOutput[]> {
    if (!email) return [];
    const invites = await this.queryOutputs()
      .where('lower(invite.email) = lower(:email)', { email })
      .andWhere('invite.pending = true')
      .orderBy('invite.created_at', 'ASC')
      .getRawMany<InviteOutput>();
    return invites.map((invite) => ({
      ...invite,
      createdAt: toDateTimeOutput(invite.createdAt),
    }));
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const invite = await this.invites
      .createQueryBuilder('invite')
      .innerJoinAndSelect('invite.group', 'group_record')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        "membership.user_id = :userId AND membership.role = 'owner'",
        { userId },
      )
      .where('invite.id = :id', { id })
      .getOne();
    if (!invite) throw new NotFoundException('Resource not found');
    await this.invites.delete({ id, group: { id: invite.group.id } });
    return { id };
  }

  async accept(
    userId: string,
    email: string | undefined,
    id: string,
  ): Promise<{ groupId: string }> {
    if (!email) throw new NotFoundException('Resource not found');

    return this.dataSource.transaction(async (manager) => {
      const invite = await manager
        .getRepository(Invites)
        .createQueryBuilder('invite')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('invite.group', 'group_record')
        .where('invite.id = :id', { id })
        .andWhere('invite.pending = true')
        .andWhere('lower(invite.email) = lower(:email)', { email })
        .getOne();
      if (!invite) throw new NotFoundException('Resource not found');

      const userExists = await manager.getRepository(Users).exists({
        where: { id: userId },
      });
      if (!userExists) throw new NotFoundException('Resource not found');

      await manager.query(
        `
          INSERT INTO public.user_group (group_id, user_id, role)
          VALUES ($1, $2, 'member')
          ON CONFLICT (group_id, user_id) DO NOTHING
        `,
        [invite.group.id, userId],
      );
      await manager
        .getRepository(Invites)
        .update({ id: invite.id }, { pending: false });
      return { groupId: invite.group.id };
    });
  }

  private queryOutputs() {
    return this.invites
      .createQueryBuilder('invite')
      .innerJoin('invite.group', 'group_record')
      .select('invite.id', 'id')
      .addSelect('invite.created_at', 'createdAt')
      .addSelect('invite.email', 'email')
      .addSelect('invite.pending', 'pending')
      .addSelect('group_record.id', 'groupId')
      .addSelect('group_record.name', 'groupName');
  }

  private toOutput(invite: Invites, group: Groups): InviteOutput {
    return {
      id: invite.id,
      createdAt: toDateTimeOutput(invite.createdAt),
      email: invite.email,
      pending: invite.pending,
      groupId: group.id,
      groupName: group.name,
    };
  }
}
