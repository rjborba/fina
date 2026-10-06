import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateTransactionInputDto,
  QueryTransactionInputDto,
  TransactionOutput,
  UpdateTransactionInputDto,
} from '@fina/types';
import { Brackets, DataSource, Repository } from 'typeorm';
import { AuthorizationService } from '../auth/authorization.service';
import { Bankaccounts } from '../bankaccounts/entities/bankaccount.entity';
import { Categories } from '../categories/entities/category.entity';
import { Imports } from '../imports/entities/import.entity';
import { Transactions } from './entities/transaction.entity';
import {
  toDateTimeOutput,
  toNullableDateOutput,
  toNullableDateTimeOutput,
} from '../common/date-output';
import { deriveBillDueDate } from '../common/bill-date';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transactions)
    private readonly transactions: Repository<Transactions>,
    private readonly dataSource: DataSource,
    private readonly authorization: AuthorizationService,
  ) {}

  async create(
    userId: string,
    input: CreateTransactionInputDto,
  ): Promise<TransactionOutput> {
    const account = await this.assertReferences(userId, input);
    if (!account) throw new NotFoundException('Resource not found');
    const billDueDate = this.resolveBillDueDate(account, input.billMonth);
    const saved = await this.transactions.save(
      this.transactions.create({
        description: input.description,
        value: input.value,
        date: input.date,
        installmentTotal: input.installmentTotal,
        installmentCurrent: input.installmentCurrent,
        creditDueDate: billDueDate,
        observation: input.observation,
        removed: false,
        toBeConsideredAt: billDueDate,
        calculatedDate: input.date,
        bankaccount: { id: input.bankaccountId },
        category: input.categoryId ? { id: input.categoryId } : null,
        group: { id: input.groupId },
        import: input.importId ? { id: input.importId } : null,
      }),
    );
    return this.findOne(userId, saved.id);
  }

  async findAll(
    userId: string,
    {
      groupId,
      page,
      pageSize,
      startDate,
      endDate,
      categoryIdList,
      accountIdList,
      accountType,
      search,
    }: QueryTransactionInputDto,
  ): Promise<{ data: TransactionOutput[]; totalCount: number }> {
    await this.authorization.assertMember(userId, groupId);
    const query = this.transactions
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.bankaccount', 'bankaccount')
      .innerJoinAndSelect('transaction.group', 'group_record')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .leftJoinAndSelect('transaction.import', 'import_record')
      .leftJoinAndSelect(
        'transaction.billPaymentReconciliation',
        'bill_payment_reconciliation',
      )
      .where('group_record.id = :groupId', { groupId })
      .andWhere('transaction.removed IS NOT TRUE');

    if (startDate) {
      const startDateValue = startDate.toISOString().slice(0, 10);
      query.andWhere(
        new Brackets((outer) => {
          outer
            .where('transaction.toBeConsideredAt >= :startDate', {
              startDate: startDateValue,
            })
            .orWhere(
              new Brackets((inner) => {
                inner
                  .where('transaction.toBeConsideredAt IS NULL')
                  .andWhere('transaction.date >= :startDate', {
                    startDate: startDateValue,
                  });
              }),
            );
        }),
      );
    }
    if (endDate) {
      const endDateValue = endDate.toISOString().slice(0, 10);
      query.andWhere(
        new Brackets((outer) => {
          outer
            .where('transaction.toBeConsideredAt <= :endDate', {
              endDate: endDateValue,
            })
            .orWhere(
              new Brackets((inner) => {
                inner
                  .where('transaction.toBeConsideredAt IS NULL')
                  .andWhere('transaction.date <= :endDate', {
                    endDate: endDateValue,
                  });
              }),
            );
        }),
      );
    }
    if (categoryIdList?.length) {
      const categoryIds = categoryIdList.filter((id) => id !== '-1');
      if (categoryIdList.includes('-1')) {
        query.andWhere(
          new Brackets((categories) => {
            if (categoryIds.length) {
              categories.where('category.id IN (:...categoryIds)', {
                categoryIds,
              });
            }
            categories.orWhere('category.id IS NULL');
          }),
        );
      } else {
        query.andWhere('category.id IN (:...categoryIds)', { categoryIds });
      }
    }
    if (accountIdList?.length) {
      query.andWhere('bankaccount.id IN (:...accountIdList)', {
        accountIdList,
      });
    }
    if (accountType) {
      query.andWhere('bankaccount.type = :accountType', { accountType });
    }
    if (search) {
      query.andWhere('transaction.description ILIKE :search', {
        search: `%${search}%`,
      });
    }

    query.orderBy('transaction.calculatedDate', 'DESC');
    if (pageSize) query.take(pageSize);
    if (page !== undefined && pageSize) query.skip(page * pageSize);

    const [data, totalCount] = await query.getManyAndCount();
    return { data: data.map((item) => this.toOutput(item)), totalCount };
  }

  async findOne(userId: string, id: string): Promise<TransactionOutput> {
    return this.toOutput(await this.findEntity(userId, id));
  }

  async update(
    userId: string,
    id: string,
    input: UpdateTransactionInputDto,
  ): Promise<TransactionOutput> {
    const current = await this.findEntity(userId, id);
    await this.assertReferences(userId, {
      groupId: current.group.id,
      bankaccountId: input.bankaccountId,
      categoryId: input.categoryId,
    });

    if (input.description !== undefined)
      current.description = input.description;
    if (input.value !== undefined) current.value = input.value;
    if (input.date !== undefined) current.date = input.date;
    if (input.installmentTotal !== undefined) {
      current.installmentTotal = input.installmentTotal;
    }
    if (input.installmentCurrent !== undefined) {
      current.installmentCurrent = input.installmentCurrent;
    }
    if (input.creditDueDate !== undefined) {
      current.creditDueDate = input.creditDueDate;
    }
    if (input.observation !== undefined)
      current.observation = input.observation;
    if (input.toBeConsideredAt !== undefined) {
      current.toBeConsideredAt = input.toBeConsideredAt;
    }
    if (input.calculatedDate !== undefined) {
      current.calculatedDate = input.calculatedDate;
    }
    if (input.bankaccountId !== undefined) {
      current.bankaccount = input.bankaccountId
        ? ({ id: input.bankaccountId } as Bankaccounts)
        : null;
    }
    if (input.categoryId !== undefined) {
      current.category = input.categoryId
        ? ({ id: input.categoryId } as Categories)
        : null;
    }
    await this.transactions.save(current);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const transaction = await this.findEntity(userId, id);
    await this.transactions.update(
      { id, group: { id: transaction.group.id } },
      { removed: true },
    );
    return { id };
  }

  private async findEntity(userId: string, id: string): Promise<Transactions> {
    const transaction = await this.transactions
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.bankaccount', 'bankaccount')
      .innerJoinAndSelect('transaction.group', 'group_record')
      .leftJoinAndSelect('transaction.import', 'import_record')
      .leftJoinAndSelect(
        'transaction.billPaymentReconciliation',
        'bill_payment_reconciliation',
      )
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .where('transaction.id = :id', { id })
      .andWhere('transaction.removed IS NOT TRUE')
      .getOne();
    if (!transaction) throw new NotFoundException('Resource not found');
    return transaction;
  }

  private async assertReferences(
    userId: string,
    input: {
      groupId: string;
      bankaccountId?: string | null;
      categoryId?: string | null;
      importId?: string | null;
    },
  ): Promise<Bankaccounts | null> {
    await this.authorization.assertMember(userId, input.groupId);
    const [account, category, importRecord] = await Promise.all([
      input.bankaccountId
        ? this.dataSource.getRepository(Bankaccounts).findOne({
            where: {
              id: input.bankaccountId,
              group: { id: input.groupId },
              removed: false,
            },
          })
        : Promise.resolve(null),
      input.categoryId
        ? this.dataSource.getRepository(Categories).exists({
            where: {
              id: input.categoryId,
              group: { id: input.groupId },
              removed: false,
            },
          })
        : Promise.resolve(true),
      input.importId
        ? this.dataSource.getRepository(Imports).exists({
            where: {
              id: input.importId,
              group: { id: input.groupId },
              removed: false,
            },
          })
        : Promise.resolve(true),
    ]);
    if ((input.bankaccountId && !account) || !category || !importRecord) {
      throw new NotFoundException('Resource not found');
    }
    return account;
  }

  private resolveBillDueDate(
    account: Bankaccounts,
    billMonth: string | null,
  ): string | null {
    if (account.type === 'credit' && billMonth === null) {
      throw new BadRequestException(
        'Bill month is required for credit card transactions',
      );
    }
    if (account.type !== 'credit' && billMonth !== null) {
      throw new BadRequestException(
        'Bill month is only allowed for credit card transactions',
      );
    }
    if (account.type !== 'credit') return null;
    if (!account.dueDate) {
      throw new BadRequestException(
        'Credit card account must have a configured due day',
      );
    }
    return deriveBillDueDate(account.dueDate, billMonth as string);
  }

  private toOutput(transaction: Transactions): TransactionOutput {
    return {
      id: transaction.id,
      createdAt: toDateTimeOutput(transaction.createdAt),
      description: transaction.description,
      value: transaction.value,
      date: toNullableDateTimeOutput(transaction.date),
      installmentTotal: transaction.installmentTotal ?? null,
      installmentCurrent: transaction.installmentCurrent ?? null,
      creditDueDate: toNullableDateOutput(transaction.creditDueDate),
      observation: transaction.observation ?? null,
      toBeConsideredAt: toNullableDateOutput(transaction.toBeConsideredAt),
      calculatedDate: toNullableDateOutput(transaction.calculatedDate),
      billPayment: transaction.billPaymentReconciliation
        ? {
            creditAccountId:
              transaction.billPaymentReconciliation.creditAccountId,
            billMonth: toNullableDateOutput(
              transaction.billPaymentReconciliation.billMonth,
            )!.slice(0, 7),
          }
        : null,
      bankaccount: transaction.bankaccount
        ? {
            id: transaction.bankaccount.id,
            name: transaction.bankaccount.name,
            type: transaction.bankaccount.type,
            dueDate: transaction.bankaccount.dueDate,
          }
        : null,
      category: transaction.category
        ? {
            id: transaction.category.id,
            name: transaction.category.name,
            icon: transaction.category.icon,
            color: transaction.category.color,
          }
        : null,
      group: { id: transaction.group.id, name: transaction.group.name },
      import: transaction.import
        ? { id: transaction.import.id, fileName: transaction.import.fileName }
        : null,
    };
  }
}
