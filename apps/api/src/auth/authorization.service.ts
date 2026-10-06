import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGroup } from '../user-groups/entities/user-group.entity';

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(UserGroup)
    private readonly memberships: Repository<UserGroup>,
  ) {}

  async assertMember(userId: string, groupId: string): Promise<void> {
    const membership = await this.memberships.exists({
      where: { user: { id: userId }, group: { id: groupId } },
    });

    if (!membership) {
      throw new NotFoundException('Resource not found');
    }
  }

  async assertOwner(userId: string, groupId: string): Promise<void> {
    const membership = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!membership) {
      throw new NotFoundException('Resource not found');
    }

    if (membership.role !== 'owner') {
      throw new ForbiddenException('Owner access required');
    }
  }
}
