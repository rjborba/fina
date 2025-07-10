import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionInputDtoType,
  CreateTransactionOutputDtoType,
  QueryTransactionInputDto,
  QueryTransactionOutputDtoType,
  UpdateTransactionInputDto,
  UpdateTransactionOutputDtoType,
} from '@fina/types';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(
    @Body()
    createTransactionDtos:
      | CreateTransactionInputDtoType
      | CreateTransactionInputDtoType[],
  ): Promise<
    CreateTransactionOutputDtoType | CreateTransactionOutputDtoType[]
  > {
    if (Array.isArray(createTransactionDtos)) {
      return await this.transactionsService.createBulk(createTransactionDtos);
    }

    return await this.transactionsService.create(createTransactionDtos);
  }

  @Get()
  async findAll(
    @Query() query: QueryTransactionInputDto,
  ): Promise<QueryTransactionOutputDtoType> {
    const {
      groupId,
      page,
      pageSize,
      startDate,
      endDate,
      categoryIdList,
      accountIdList,
      search,
    } = query;

    if (!query.groupId) {
      throw new BadRequestException('groupId is required');
    }

    if (pageSize && pageSize > 5000) {
      throw new BadRequestException('pageSize must be less than 5000');
    }

    const { data, totalCount } = await this.transactionsService.findAll({
      groupId: groupId,
      page,
      pageSize: pageSize ? pageSize : 100,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      categoryIdList,
      accountIdList,
      search,
    });

    return {
      data,
      totalCount,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionInputDto,
  ): Promise<UpdateTransactionOutputDtoType> {
    return await this.transactionsService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(+id);
  }
}
