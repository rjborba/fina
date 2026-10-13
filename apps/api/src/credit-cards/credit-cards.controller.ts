import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CreateCreditCardInputDto,
  CreditCardListOutputDto,
  CreditCardOutputDto,
  CreditCardQueryDto,
  DeleteCreditCardOutputDto,
  IdParamDto,
  UpdateCreditCardInputDto,
} from '../contracts/api-dtos';
import { CreditCardsService } from './credit-cards.service';

@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly cards: CreditCardsService) {}

  @Post()
  @ApiCreatedResponse({ type: CreditCardOutputDto })
  @ZodSerializerDto(CreditCardOutputDto)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateCreditCardInputDto,
  ) {
    return this.cards.create(user.id, input);
  }

  @Get()
  @ApiOkResponse({ type: CreditCardListOutputDto })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ApiQuery({ name: 'accountId', type: String, required: false })
  @ApiQuery({ name: 'includeArchived', type: Boolean, required: false })
  @ZodSerializerDto(CreditCardOutputDto)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CreditCardQueryDto,
  ) {
    return this.cards.findAll(user.id, query);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CreditCardOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(CreditCardOutputDto)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() input: UpdateCreditCardInputDto,
  ) {
    return this.cards.update(user.id, params.id, input);
  }

  @Delete(':id')
  @ApiOkResponse({ type: DeleteCreditCardOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(DeleteCreditCardOutputDto)
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.cards.remove(user.id, params.id);
  }
}
