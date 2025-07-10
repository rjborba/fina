import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGroup } from './entities/user-group.entity';
// import { CreateUserGroupDto } from './dto/create-user-group.dto';
// import { UpdateUserGroupDto } from './dto/update-user-group.dto';

@Injectable()
export class UserGroupsService {
  constructor(
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
  ) {}

  async isUserInGroup(userId: string, groupId: string): Promise<boolean> {
    const count = await this.userGroupRepository.count({
      where: {
        user: { id: userId },
        group: { id: groupId },
      },
    });
    return count > 0;
  }

  // create(createUserGroupDto: CreateUserGroupDto) {
  //   return 'This action adds a new userGroup';
  // }

  findAll() {
    return `This action returns all userGroups`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userGroup`;
  }

  // update(id: number, updateUserGroupDto: UpdateUserGroupDto) {
  //   return `This action updates a #${id} userGroup`;
  // }

  remove(id: number) {
    return `This action removes a #${id} userGroup`;
  }
}
