import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionInputDto,
  DeleteTransactionOutputDto,
  QueryTransactionInputDto,
  QueryTransactionOutputDto,
  UpdateTransactionInputDto,
  TransactionOutputDto,
  IdParamDto,
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

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiCreatedResponse({ type: TransactionOutputDto })
  @ZodSerializerDto(TransactionOutputDto)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateTransactionInputDto,
  ) {
    return this.transactionsService.create(user.id, input);
  }

  @Get()
  @ApiOkResponse({ type: QueryTransactionOutputDto })
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'categoryIdList', type: [String], required: false })
  @ApiQuery({ name: 'accountIdList', type: [String], required: false })
  @ApiQuery({
    name: 'accountType',
    enum: ['checkout', 'credit'],
    required: false,
  })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ZodSerializerDto(QueryTransactionOutputDto)
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTransactionInputDto,
  ) {
    const {
      groupId,
      page,
      pageSize,
      startDate,
      endDate,
      categoryIdList,
      accountIdList,
      accountType,
      search,
    } = query;

    const { data, totalCount } = await this.transactionsService.findAll(
      user.id,
      {
        groupId: groupId,
        page,
        pageSize: pageSize ? pageSize : 100,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        categoryIdList,
        accountIdList,
        accountType,
        search,
      },
    );

    return {
      data,
      totalCount,
    };
  }

  @Get(':id')
  @ApiOkResponse({ type: TransactionOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(TransactionOutputDto)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.transactionsService.findOne(user.id, params.id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: TransactionOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(TransactionOutputDto)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() updateTransactionDto: UpdateTransactionInputDto,
  ) {
    return this.transactionsService.update(
      user.id,
      params.id,
      updateTransactionDto,
    );
  }

  @Delete(':id')
  @ApiOkResponse({ type: DeleteTransactionOutputDto })
  @ApiParam({ name: 'id', type: String })
  @ZodSerializerDto(DeleteTransactionOutputDto)
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.transactionsService.remove(user.id, params.id);
  }
}
