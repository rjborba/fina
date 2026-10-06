import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AcceptInviteOutputDto,
  CreateInviteInputDto,
  DeleteInviteOutputDto,
  InviteListOutputDto,
  InviteOutputDto,
  GroupQueryInputDto,
  IdParamDto,
} from '../contracts/api-dtos';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  @ApiCreatedResponse({ type: InviteOutputDto })
  @ZodSerializerDto(InviteOutputDto)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateInviteInputDto,
  ) {
    return this.invitesService.create(user.id, input);
  }

  @Get('mine')
  @ApiOkResponse({ type: InviteListOutputDto })
  @ZodSerializerDto(InviteOutputDto)
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.invitesService.findMine(user.email);
  }

  @Post(':id/accept')
  @ApiOkResponse({ type: AcceptInviteOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(AcceptInviteOutputDto)
  accept(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.invitesService.accept(user.id, user.email, params.id);
  }

  @Get()
  @ApiOkResponse({ type: InviteListOutputDto })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ZodSerializerDto(InviteOutputDto)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GroupQueryInputDto,
  ) {
    return this.invitesService.findAll(user.id, query.groupId);
  }

  @Delete(':id')
  @ApiOkResponse({ type: DeleteInviteOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(DeleteInviteOutputDto)
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.invitesService.remove(user.id, params.id);
  }
}
