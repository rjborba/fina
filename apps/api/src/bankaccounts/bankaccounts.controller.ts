import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Post,
  Query,
} from '@nestjs/common';
import { BankaccountsService } from './bankaccounts.service';
import {
  BankaccountListOutputDto,
  BankaccountOutputDto,
  CreateBankaccountInputDto,
  DeleteBankaccountOutputDto,
  IdParamDto,
  QueryBankaccountInputDto,
} from '../contracts/api-dtos';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('bankaccounts')
export class BankaccountsController {
  constructor(private readonly bankaccountsService: BankaccountsService) {}

  @Post()
  @ApiCreatedResponse({ type: BankaccountOutputDto })
  @ZodSerializerDto(BankaccountOutputDto)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createBankaccountDto: CreateBankaccountInputDto,
  ) {
    return this.bankaccountsService.create(user.id, createBankaccountDto);
  }

  @Get()
  @ApiOkResponse({ type: BankaccountListOutputDto })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ZodSerializerDto(BankaccountOutputDto)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryBankaccountInputDto,
  ) {
    return this.bankaccountsService.findAll(user.id, query.groupId);
  }

  @Delete(':id')
  @ApiOkResponse({ type: DeleteBankaccountOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(DeleteBankaccountOutputDto)
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.bankaccountsService.remove(user.id, params.id);
  }
}
