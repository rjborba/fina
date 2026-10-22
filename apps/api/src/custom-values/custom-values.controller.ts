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
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CustomValueItemParamsDto,
  CustomValueListDto,
  CustomValueOutputDto,
  CustomValueParamsDto,
  DeleteCustomValueDto,
  SaveCustomValueDto,
} from '../contracts/api-dtos';
import { CustomValuesService } from './custom-values.service';

@Controller('groups/:groupId/custom-values')
@ApiParam({ name: 'groupId', type: String })
export class CustomValuesController {
  constructor(private readonly service: CustomValuesService) {}

  @Get()
  @ApiOkResponse({ type: CustomValueListDto })
  @ZodSerializerDto(CustomValueOutputDto)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CustomValueParamsDto,
  ) {
    return this.service.findAll(user.id, params.groupId);
  }

  @Post()
  @ApiCreatedResponse({ type: CustomValueOutputDto })
  @ZodSerializerDto(CustomValueOutputDto)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CustomValueParamsDto,
    @Body() input: SaveCustomValueDto,
  ) {
    return this.service.save(user.id, params.groupId, input);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: CustomValueOutputDto })
  @ZodSerializerDto(CustomValueOutputDto)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CustomValueItemParamsDto,
    @Body() input: SaveCustomValueDto,
  ) {
    return this.service.save(user.id, params.groupId, input, params.id);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: DeleteCustomValueDto })
  @ZodSerializerDto(DeleteCustomValueDto)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CustomValueItemParamsDto,
  ) {
    return this.service.remove(user.id, params.groupId, params.id);
  }
}
