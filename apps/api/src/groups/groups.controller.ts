import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import {
  CreateGroupInputDto,
  DeleteGroupInputDto,
  DeleteGroupOutputDto,
  GroupListOutputDto,
  GroupOutputDto,
  IdParamDto,
  UpdateGroupReviewSettingsInputDto,
} from '../contracts/api-dtos';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { GroupsService } from './groups.service';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiCreatedResponse({ type: GroupOutputDto })
  @ZodSerializerDto(GroupOutputDto)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateGroupInputDto,
  ) {
    return this.groupsService.create(user.id, input);
  }

  @Get()
  @ApiOkResponse({ type: GroupListOutputDto })
  @ZodSerializerDto(GroupOutputDto)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: GroupOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(GroupOutputDto)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.groupsService.findOne(user.id, params.id);
  }

  @Patch(':id/review-settings')
  @ApiOkResponse({ type: GroupOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(GroupOutputDto)
  updateReviewSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() input: UpdateGroupReviewSettingsInputDto,
  ) {
    return this.groupsService.updateReviewSettings(user.id, params.id, input);
  }

  @Delete(':id')
  @ApiOkResponse({ type: DeleteGroupOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(DeleteGroupOutputDto)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() input: DeleteGroupInputDto,
  ) {
    return this.groupsService.remove(user.id, params.id, input.confirmName);
  }
}
