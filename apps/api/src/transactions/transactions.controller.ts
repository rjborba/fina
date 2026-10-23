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
import { TransactionConversationsService } from './transaction-conversations.service';
import {
  CreateTransactionInputDto,
  DeleteTransactionOutputDto,
  QueryTransactionInputDto,
  QueryTransactionOutputDto,
  UpdateTransactionInputDto,
  TransactionOutputDto,
  IdParamDto,
  TransactionCardValuesQueryDto,
  TransactionCardValuesOutputDto,
  TransactionCardValueDto,
  AddTransactionCommentDto,
  ResolveTransactionConversationDto,
  TransactionConversationDto,
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
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly conversations: TransactionConversationsService,
  ) {}

  @Get(':id/conversation')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: TransactionConversationDto })
  @ZodSerializerDto(TransactionConversationDto)
  conversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
  ) {
    return this.conversations.read(user.id, params.id);
  }

  @Post(':id/conversation/messages')
  @ApiParam({ name: 'id', type: String })
  @ApiCreatedResponse({ type: TransactionConversationDto })
  @ZodSerializerDto(TransactionConversationDto)
  addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() input: AddTransactionCommentDto,
  ) {
    return this.conversations.add(user.id, params.id, input.body);
  }

  @Patch(':id/conversation')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: TransactionConversationDto })
  @ZodSerializerDto(TransactionConversationDto)
  resolveConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() input: ResolveTransactionConversationDto,
  ) {
    return this.conversations.resolve(user.id, params.id, input.resolved);
  }

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
  @ApiQuery({ name: 'reviewMonths', type: [String], required: false })
  @ApiQuery({ name: 'categoryIdList', type: [String], required: false })
  @ApiQuery({ name: 'accountIdList', type: [String], required: false })
  @ApiQuery({ name: 'cardList', type: [String], required: false })
  @ApiQuery({ name: 'importIdList', type: [String], required: false })
  @ApiQuery({
    name: 'importSource',
    enum: ['imported', 'manual'],
    required: false,
  })
  @ApiQuery({ name: 'minValue', type: Number, required: false })
  @ApiQuery({ name: 'maxValue', type: Number, required: false })
  @ApiQuery({
    name: 'accountType',
    enum: ['checkout', 'credit'],
    required: false,
  })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({
    name: 'dateBasis',
    enum: ['cash-flow', 'monthly-review'],
    required: false,
  })
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
      cardList,
      accountType,
      search,
      dateBasis,
      reviewMonths,
      importSource,
      importIdList,
      minValue,
      maxValue,
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
        cardList,
        accountType,
        search,
        dateBasis,
        reviewMonths,
        importSource,
        importIdList,
        minValue,
        maxValue,
      },
    );

    return {
      data,
      totalCount,
    };
  }

  @Get('card-values')
  @ApiQuery({ name: 'groupId', type: String, required: true })
  @ApiQuery({ name: 'accountId', type: String, required: false })
  @ApiOkResponse({ type: TransactionCardValuesOutputDto })
  @ZodSerializerDto(TransactionCardValueDto)
  cardValues(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionCardValuesQueryDto,
  ) {
    return this.transactionsService.cardValues(
      user.id,
      query.groupId,
      query.accountId,
    );
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
