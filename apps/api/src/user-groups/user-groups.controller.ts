import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import {
  GroupMemberListOutputDto,
  GroupMemberOutputDto,
  GroupQueryInputDto,
} from '../contracts/api-dtos';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserGroupsService } from './user-groups.service';

@Controller('user-groups')
export class UserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Get()
  @ApiOkResponse({ type: GroupMemberListOutputDto })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ZodSerializerDto(GroupMemberOutputDto)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GroupQueryInputDto,
  ) {
    return this.userGroupsService.findAll(user.id, query.groupId);
  }
}
