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
import { ensureBillReviewMonth } from '../common/review-month';
import { CreditCardBillReviews } from '../credit-card-bills/entities/credit-card-bill-review.entity';
import { CreditCardBillReconciliations } from '../credit-card-bills/entities/credit-card-bill-reconciliation.entity';
import {
  legacyTimestampTimezone,
  transactionOccurrenceDate,
  transactionOccurrenceDateSql,
  utcTimestampTransformer,
} from '../common/utc-timestamp';

const OCCURRENCE_DATE_SQL = transactionOccurrenceDateSql(
  'transaction',
  ':legacyTimestampTimezone',
);
const PAYMENT_OCCURRENCE_DATE_SQL = transactionOccurrenceDateSql(
  'bill_cash_flow_payment',
  ':legacyTimestampTimezone',
);

const REVIEW_MONTH_SQL = `CASE WHEN bankaccount.type = 'credit' THEN
  coalesce(bill_review.review_month, date_trunc('month', transaction.credit_due_date)::date)
  ELSE coalesce(transaction.review_month, date_trunc('month', ${OCCURRENCE_DATE_SQL})::date) END`;
const BILL_REVIEW_JOIN = `bill_review.group_id = transaction.group_id
  AND bill_review.credit_account_id = transaction.bankaccount_id
  AND bill_review.bill_month = date_trunc('month', transaction.credit_due_date)::date`;
const CASH_FLOW_DATE_SQL = `CASE WHEN bankaccount.type = 'credit' THEN
  coalesce(${PAYMENT_OCCURRENCE_DATE_SQL}, bill_cash_flow_payment.calculated_date, bill_cash_flow_payment.to_be_considered_at, transaction.credit_due_date, ${OCCURRENCE_DATE_SQL})
  ELSE coalesce(transaction.to_be_considered_at, ${OCCURRENCE_DATE_SQL}) END`;
const BILL_RECONCILIATION_JOIN = `card_reconciliation.group_id = transaction.group_id
  AND card_reconciliation.credit_account_id = transaction.bankaccount_id
  AND card_reconciliation.bill_month = date_trunc('month', transaction.credit_due_date)::date`;
const BILL_PAYMENT_JOIN = `bill_cash_flow_payment.id = card_reconciliation.payment_transaction_id
  AND bill_cash_flow_payment.group_id = transaction.group_id AND bill_cash_flow_payment.removed IS NOT TRUE
  AND bill_cash_flow_payment.value IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.bankaccounts payment_account
    WHERE payment_account.id = bill_cash_flow_payment.bankaccount_id
      AND payment_account.group_id = transaction.group_id AND payment_account.type = 'checkout')`;

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
    const saved = await this.dataSource.transaction(async (manager) => {
      if (account.type === 'credit') {
        await ensureBillReviewMonth(
          manager,
          input.groupId,
          account.id,
          input.billMonth!,
          input.reviewMonth,
        );
      }
      return manager.getRepository(Transactions).save(
        manager.getRepository(Transactions).create({
          description: input.description,
          value: input.value,
          date: utcTimestampTransformer.to(input.date) as Date | null,
          dateIsUtc: true,
          installmentTotal: input.installmentTotal,
          installmentCurrent: input.installmentCurrent,
          creditDueDate: billDueDate,
          observation: input.observation,
          removed: false,
          toBeConsideredAt: billDueDate,
          calculatedDate: toNullableDateOutput(input.date),
          reviewMonth:
            account.type !== 'credit' && input.reviewMonth
              ? `${input.reviewMonth}-01`
              : null,
          bankaccount: { id: input.bankaccountId },
          category: input.categoryId ? { id: input.categoryId } : null,
          group: { id: input.groupId },
          import: input.importId ? { id: input.importId } : null,
        }),
      );
    });
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
      dateBasis,
    }: QueryTransactionInputDto,
    billMonth?: string,
  ): Promise<{ data: TransactionOutput[]; totalCount: number }> {
    await this.authorization.assertMember(userId, groupId);
    const query = this.transactions
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .leftJoinAndSelect('transaction.bankaccount', 'bankaccount')
      .leftJoinAndMapOne(
        'transaction.billReview',
        CreditCardBillReviews,
        'bill_review',
        BILL_REVIEW_JOIN,
      )
      .leftJoin(
        CreditCardBillReconciliations,
        'card_reconciliation',
        BILL_RECONCILIATION_JOIN,
      )
      .leftJoinAndMapOne(
        'transaction.billCashFlowPayment',
        Transactions,
        'bill_cash_flow_payment',
        BILL_PAYMENT_JOIN,
      )
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
      .setParameter('legacyTimestampTimezone', legacyTimestampTimezone())
      .andWhere('transaction.removed IS NOT TRUE')
      .andWhere('bill_payment_reconciliation.id IS NULL');

    if (billMonth)
      query.andWhere(
        "date_trunc('month', transaction.credit_due_date)::date = :billMonth",
        { billMonth: `${billMonth}-01` },
      );

    if (dateBasis === 'monthly-review') {
      if (startDate)
        query.andWhere(`${REVIEW_MONTH_SQL} >= :reviewStartDate`, {
          reviewStartDate: startDate.toISOString().slice(0, 10),
        });
      if (endDate)
        query.andWhere(`${REVIEW_MONTH_SQL} <= :reviewEndDate`, {
          reviewEndDate: endDate.toISOString().slice(0, 10),
        });
    }
    if (startDate && dateBasis !== 'monthly-review') {
      const startDateValue = startDate.toISOString().slice(0, 10);
      query.andWhere(`${CASH_FLOW_DATE_SQL} >= :startDate`, {
        startDate: startDateValue,
      });
    }
    if (endDate && dateBasis !== 'monthly-review') {
      const endDateValue = endDate.toISOString().slice(0, 10);
      query.andWhere(`${CASH_FLOW_DATE_SQL} <= :endDate`, {
        endDate: endDateValue,
      });
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
    const nextAccount = await this.assertReferences(userId, {
      groupId: current.group.id,
      bankaccountId: input.bankaccountId,
      categoryId: input.categoryId,
    });

    if (
      input.reviewMonth !== undefined &&
      (current.bankaccount?.type === 'credit' || nextAccount?.type === 'credit')
    ) {
      throw new BadRequestException({
        code: 'BILL_REVIEW_MONTH_REQUIRED',
        message:
          'Change the reference month on the credit card bill so every purchase stays in the same review.',
      });
    }
    if (input.reviewMonth !== undefined)
      current.reviewMonth = `${input.reviewMonth}-01`;

    if (
      (current.bankaccount?.type === 'credit' ||
        nextAccount?.type === 'credit') &&
      ((input.creditDueDate !== undefined &&
        toNullableDateOutput(input.creditDueDate) !==
          toNullableDateOutput(current.creditDueDate)) ||
        (input.toBeConsideredAt !== undefined &&
          toNullableDateOutput(input.toBeConsideredAt) !==
            toNullableDateOutput(current.toBeConsideredAt)) ||
        (input.bankaccountId !== undefined &&
          input.bankaccountId !== current.bankaccount?.id))
    ) {
      throw new BadRequestException({
        code: 'BILL_IDENTITY_IMMUTABLE',
        message:
          'A credit card purchase must keep its account and bill due date. Change the reference month on the bill, or remove and recreate a purchase assigned to the wrong bill.',
      });
    }

    if (input.description !== undefined)
      current.description = input.description;
    if (input.value !== undefined) current.value = input.value;
    if (input.date !== undefined) {
      current.date = utcTimestampTransformer.to(input.date) as Date | null;
      current.dateIsUtc = true;
    }
    if (input.installmentTotal !== undefined) {
      current.installmentTotal = input.installmentTotal;
    }
    if (input.installmentCurrent !== undefined) {
      current.installmentCurrent = input.installmentCurrent;
    }
    if (input.creditDueDate !== undefined) {
      current.creditDueDate = toNullableDateOutput(input.creditDueDate);
    }
    if (input.observation !== undefined)
      current.observation = input.observation;
    if (input.toBeConsideredAt !== undefined) {
      current.toBeConsideredAt = toNullableDateOutput(input.toBeConsideredAt);
    }
    if (input.calculatedDate !== undefined) {
      current.calculatedDate = toNullableDateOutput(input.calculatedDate);
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
    await this.dataSource.transaction(async (manager) => {
      const account =
        nextAccount ??
        (input.bankaccountId === null ? null : current.bankaccount);
      const billMonth = toNullableDateOutput(current.creditDueDate)?.slice(
        0,
        7,
      );
      if (account?.type === 'credit' && billMonth) {
        await ensureBillReviewMonth(
          manager,
          current.group.id,
          account.id,
          billMonth,
        );
      }
      await manager.getRepository(Transactions).save(current);
    });
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
      .leftJoinAndMapOne(
        'transaction.billReview',
        CreditCardBillReviews,
        'bill_review',
        BILL_REVIEW_JOIN,
      )
      .leftJoin(
        CreditCardBillReconciliations,
        'card_reconciliation',
        BILL_RECONCILIATION_JOIN,
      )
      .leftJoinAndMapOne(
        'transaction.billCashFlowPayment',
        Transactions,
        'bill_cash_flow_payment',
        BILL_PAYMENT_JOIN,
      )
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
      date: toNullableDateTimeOutput(transactionOccurrenceDate(transaction)),
      installmentTotal: transaction.installmentTotal ?? null,
      installmentCurrent: transaction.installmentCurrent ?? null,
      creditDueDate: toNullableDateOutput(transaction.creditDueDate),
      observation: transaction.observation ?? null,
      toBeConsideredAt: toNullableDateOutput(transaction.toBeConsideredAt),
      calculatedDate: toNullableDateOutput(transaction.calculatedDate),
      reviewMonth:
        transaction.bankaccount?.type === 'credit'
          ? ((
              toNullableDateOutput(transaction.billReview?.reviewMonth) ??
              toNullableDateOutput(transaction.creditDueDate)
            )?.slice(0, 7) ?? null)
          : ((
              toNullableDateOutput(transaction.reviewMonth) ??
              toNullableDateOutput(transactionOccurrenceDate(transaction))
            )?.slice(0, 7) ?? null),
      cashFlowDate:
        transaction.bankaccount?.type === 'credit'
          ? (toNullableDateOutput(
              transactionOccurrenceDate(transaction.billCashFlowPayment),
            ) ??
            toNullableDateOutput(
              transaction.billCashFlowPayment?.calculatedDate,
            ) ??
            toNullableDateOutput(
              transaction.billCashFlowPayment?.toBeConsideredAt,
            ) ??
            toNullableDateOutput(transaction.creditDueDate) ??
            toNullableDateOutput(transactionOccurrenceDate(transaction)))
          : (toNullableDateOutput(transaction.toBeConsideredAt) ??
            toNullableDateOutput(transactionOccurrenceDate(transaction))),
      cashFlowStatus:
        transaction.bankaccount?.type === 'credit'
          ? transaction.billCashFlowPayment &&
            (transaction.billCashFlowPayment.date ??
              transaction.billCashFlowPayment.calculatedDate ??
              transaction.billCashFlowPayment.toBeConsideredAt)
            ? 'confirmed'
            : 'scheduled'
          : (transaction.toBeConsideredAt ?? transaction.date)
            ? 'confirmed'
            : null,
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
