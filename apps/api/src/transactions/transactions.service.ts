import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, Repository } from 'typeorm';
import { Transactions } from './entities/transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Bankaccount,
  Category,
  Group,
  Import,
  Transaction,
  CreateTransactionInputDto,
  QueryTransactionInputDto,
  UpdateTransactionInputDto,
} from '@fina/types';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transactions)
    private readonly transactionRepository: Repository<Transactions>,
  ) {}

  async create(createTransactionDto: CreateTransactionInputDto) {
    const entity = new Transactions({
      description: createTransactionDto.description,
      value: createTransactionDto.value,
      date: createTransactionDto.date,
      installmentTotal: createTransactionDto.installmentTotal,
      installmentCurrent: createTransactionDto.installmentCurrent,
      creditDueDate: createTransactionDto.creditDueDate,
      observation: createTransactionDto.observation,
      removed: createTransactionDto.removed,
      toBeConsideredAt: createTransactionDto.toBeConsideredAt,
      calculatedDate: createTransactionDto.calculatedDate,
      bankaccount: { id: createTransactionDto.bankaccountId } as Bankaccount,
      category: { id: createTransactionDto.categoryId } as Category,
      group: { id: createTransactionDto.groupId } as Group,
      import: { id: createTransactionDto.importId } as Import,
    });

    return await this.transactionRepository.save(entity);
  }

  async createBulk(createTransactionDtos: CreateTransactionInputDto[]) {
    const items = createTransactionDtos.map(
      (createTransactionDto) =>
        new Transactions({
          description: createTransactionDto.description,
          value: createTransactionDto.value,
          date: createTransactionDto.date,
          installmentTotal: createTransactionDto.installmentTotal,
          installmentCurrent: createTransactionDto.installmentCurrent,
          creditDueDate: createTransactionDto.creditDueDate,
          observation: createTransactionDto.observation,
          removed: createTransactionDto.removed,
          toBeConsideredAt: createTransactionDto.toBeConsideredAt,
          calculatedDate: createTransactionDto.calculatedDate,
          bankaccount: {
            id: createTransactionDto.bankaccountId,
          } as Bankaccount,
          category: { id: createTransactionDto.categoryId } as Category,
          group: { id: createTransactionDto.groupId } as Group,
          import: { id: createTransactionDto.importId } as Import,
        }),
    );
    const transactions = await this.transactionRepository.save(items);

    return transactions;
  }

  async findAll({
    groupId,
    page,
    pageSize,
    startDate,
    endDate,
    categoryIdList,
    accountIdList,
    search,
  }: QueryTransactionInputDto) {
    const qb = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.bankaccount', 'bankaccount')
      .leftJoinAndSelect('transaction.group', 'group')
      .leftJoinAndSelect('transaction.import', 'import')
      .where('group.id = :groupId', { groupId });

    if (startDate) {
      qb.andWhere(
        new Brackets((qb1) => {
          qb1
            .where('transaction.toBeConsideredAt >= :startDate', {
              startDate,
            })
            .orWhere(
              new Brackets((qb2) => {
                qb2
                  .where('transaction.toBeConsideredAt IS NULL')
                  .andWhere('transaction.date >= :startDate', { startDate });
              }),
            );
        }),
      );
    }
    if (endDate) {
      qb.andWhere(
        new Brackets((qb1) => {
          qb1
            .where('transaction.toBeConsideredAt <= :endDate', { endDate })
            .orWhere(
              new Brackets((qb2) => {
                qb2
                  .where('transaction.toBeConsideredAt IS NULL')
                  .andWhere('transaction.date <= :endDate', { endDate });
              }),
            );
        }),
      );
    }
    if (categoryIdList && categoryIdList.length > 0) {
      const withoutNull = categoryIdList.filter(
        (current) => current !== null && current !== '-1',
      );
      if (categoryIdList.includes('-1')) {
        qb.andWhere(
          new Brackets((qb1) => {
            if (withoutNull.length > 0) {
              qb1.where('category.id IN (:...withoutNull)', { withoutNull });
            }
            qb1.orWhere('category.id IS NULL');
          }),
        );
      } else {
        qb.andWhere('category.id IN (:...categoryIdList)', {
          categoryIdList: withoutNull,
        });
      }
    }

    if (accountIdList && accountIdList.length > 0) {
      qb.andWhere('bankaccount.id IN (:...accountIdList)', { accountIdList });
    }
    if (search) {
      qb.andWhere('transaction.description ILIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('transaction.calculatedDate', 'DESC');

    if (pageSize) {
      qb.take(pageSize);
    }
    if (page && pageSize) {
      console.log(page, pageSize);
      qb.skip(page * pageSize);
    }

    const [data, totalCount] = await qb.getManyAndCount();
    return { data, totalCount };
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['category', 'bankaccount', 'group', 'import'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionInputDto,
  ): Promise<Transaction> {
    await this.transactionRepository.update(id, {
      description: updateTransactionDto.description,
      value: updateTransactionDto.value,
      date: updateTransactionDto.date,
      installmentTotal: updateTransactionDto.installmentTotal,
      installmentCurrent: updateTransactionDto.installmentCurrent,
      creditDueDate: updateTransactionDto.creditDueDate,
      observation: updateTransactionDto.observation,
      removed: updateTransactionDto.removed,
      toBeConsideredAt: updateTransactionDto.toBeConsideredAt,
      calculatedDate: updateTransactionDto.calculatedDate,
      // bankaccount: updateTransactionDto.bankaccountId
      //   ? { id: updateTransactionDto.bankaccountId }
      //   : undefined,
      category: updateTransactionDto.categoryId
        ? { id: updateTransactionDto.categoryId }
        : undefined,
      // group: updateTransactionDto.groupId
      //   ? { id: updateTransactionDto.groupId }
      //   : undefined,
      // import: updateTransactionDto.importId
      //   ? { id: updateTransactionDto.importId }
      //   : undefined,
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.transactionRepository.delete(id);
    return { data: 'success' };
  }
}
