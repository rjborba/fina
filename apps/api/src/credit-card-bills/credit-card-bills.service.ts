import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreditCardBillDetail,
  CreditCardBillListQuery,
  CreditCardBillPayment,
  CreditCardBillStatus,
  CreditCardBillSummary,
  ReconcileCreditCardBillInput,
  UpdateCreditCardBillReviewMonthInput,
} from '@fina/types';
import { DataSource, QueryFailedError } from 'typeorm';
import { AuthorizationService } from '../auth/authorization.service';
import { deriveBillDueDate } from '../common/bill-date';
import { TransactionsService } from '../transactions/transactions.service';
import { shiftReviewMonth } from '../common/review-month';
import {
  legacyTimestampTimezone,
  transactionOccurrenceDateSql,
} from '../common/utc-timestamp';

type BillRow = {
  account_id: string;
  account_name: string;
  bill_month: string;
  due_date: string;
  review_month: string;
  transaction_count: number | string;
  total: string;
  reconciliation_id: string | null;
  reconciled_bill_total: string | null;
  payment_transaction_id: string | null;
  payment_description: string | null;
  payment_value: number | string | null;
  payment_date: string | null;
  payment_account_id: string | null;
  payment_account_name: string | null;
};

type CandidateRow = {
  transaction_id: string;
  description: string | null;
  value: number | string;
  payment_date: string;
  account_id: string;
  account_name: string;
};

type CreditAccountScheduleRow = {
  account_id: string;
  account_name: string;
  created_date: string;
  due_day: number | string;
  review_month_offset: number;
};

const DAY_IN_MS = 86_400_000;
const RECONCILIATION_WINDOW_DAYS = 10;

const toCents = (value: number) => Math.round(value * 100);

@Injectable()
export class CreditCardBillsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly authorization: AuthorizationService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async findAll(
    userId: string,
    query: CreditCardBillListQuery,
  ): Promise<CreditCardBillSummary[]> {
    await this.authorization.assertMember(userId, query.groupId);
    const rows = await this.findBillRows(query.groupId, {
      startDate: query.startDate,
      endDate: query.endDate,
      dateBasis: query.dateBasis,
    });
    return rows.map((row) => this.toSummary(row));
  }

  async findOne(
    userId: string,
    groupId: string,
    accountId: string,
    billMonth: string,
  ): Promise<CreditCardBillDetail> {
    await this.authorization.assertMember(userId, groupId);
    const bill = await this.findBill(groupId, accountId, billMonth);
    const { data: transactions } = await this.transactionsService.findAll(
      userId,
      {
        groupId,
        accountIdList: [accountId],
        accountType: 'credit',
      },
      billMonth,
    );
    const candidates = await this.findCandidates(groupId, bill);
    return { bill, transactions, candidates };
  }

  async updateReviewMonth(
    userId: string,
    accountId: string,
    billMonth: string,
    input: UpdateCreditCardBillReviewMonthInput,
  ): Promise<CreditCardBillDetail> {
    await this.authorization.assertMember(userId, input.groupId);
    await this.findBill(input.groupId, accountId, billMonth);
    await this.dataSource.query(
      `
      INSERT INTO public.credit_card_bill_reviews (group_id, credit_account_id, bill_month, review_month)
      VALUES ($1, $2, $3::date, $4::date)
      ON CONFLICT (group_id, credit_account_id, bill_month)
      DO UPDATE SET review_month = EXCLUDED.review_month
    `,
      [input.groupId, accountId, `${billMonth}-01`, `${input.reviewMonth}-01`],
    );
    return this.findOne(userId, input.groupId, accountId, billMonth);
  }

  async reconcile(
    userId: string,
    accountId: string,
    billMonth: string,
    input: ReconcileCreditCardBillInput,
  ): Promise<CreditCardBillDetail> {
    await this.authorization.assertMember(userId, input.groupId);
    const bill = await this.findBill(input.groupId, accountId, billMonth);
    if (bill.status === 'empty') {
      throw new BadRequestException(
        'Empty credit card bills do not require reconciliation',
      );
    }
    const payment = await this.transactionsService.findOne(
      userId,
      input.paymentTransactionId,
    );

    if (
      payment.group.id !== input.groupId ||
      payment.bankaccount?.type !== 'checkout' ||
      payment.value === null
    ) {
      throw new NotFoundException('Resource not found');
    }

    const paymentDate =
      payment.date?.slice(0, 10) ??
      payment.calculatedDate ??
      payment.toBeConsideredAt ??
      null;
    if (!paymentDate) {
      throw new BadRequestException('Payment transaction must have a date');
    }
    if (toCents(Math.abs(payment.value)) !== toCents(Math.abs(bill.total))) {
      throw new BadRequestException(
        'Payment transaction amount must match the bill total',
      );
    }
    if (!this.isWithinReconciliationWindow(paymentDate, bill.dueDate)) {
      throw new BadRequestException(
        `Payment transaction must be within ${RECONCILIATION_WINDOW_DAYS} days of the bill due date`,
      );
    }

    try {
      await this.dataSource.query(
        `
          INSERT INTO public.credit_card_bill_reconciliations (
            group_id,
            credit_account_id,
            bill_month,
            payment_transaction_id,
            reconciled_bill_total
          ) VALUES ($1, $2, $3::date, $4, $5::numeric)
          ON CONFLICT (group_id, credit_account_id, bill_month)
          DO UPDATE SET
            payment_transaction_id = EXCLUDED.payment_transaction_id,
            reconciled_bill_total = EXCLUDED.reconciled_bill_total,
            updated_at = now()
        `,
        [
          input.groupId,
          accountId,
          `${billMonth}-01`,
          input.paymentTransactionId,
          bill.total.toFixed(2),
        ],
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'Payment transaction is already reconciled to another bill',
        );
      }
      throw error;
    }

    return this.findOne(userId, input.groupId, accountId, billMonth);
  }

  async unlink(
    userId: string,
    groupId: string,
    accountId: string,
    billMonth: string,
  ): Promise<{ accountId: string; billMonth: string }> {
    await this.authorization.assertMember(userId, groupId);
    await this.findBill(groupId, accountId, billMonth);
    await this.dataSource.query(
      `
        DELETE FROM public.credit_card_bill_reconciliations
        WHERE group_id = $1
          AND credit_account_id = $2
          AND bill_month = $3::date
      `,
      [groupId, accountId, `${billMonth}-01`],
    );
    return { accountId, billMonth };
  }

  private async findBill(
    groupId: string,
    accountId: string,
    billMonth: string,
  ): Promise<CreditCardBillSummary> {
    const [row] = await this.findBillRows(groupId, { accountId, billMonth });
    if (!row) throw new NotFoundException('Resource not found');
    return this.toSummary(row);
  }

  private async findBillRows(
    groupId: string,
    filter: {
      startDate?: Date;
      endDate?: Date;
      accountId?: string;
      billMonth?: string;
      dateBasis?: 'cash-flow' | 'monthly-review';
    },
  ): Promise<BillRow[]> {
    const values: unknown[] = [groupId, legacyTimestampTimezone()];
    const paymentDate = transactionOccurrenceDateSql('payment', '$2');
    const conditions = ['bill_keys.group_id = $1', "account.type = 'credit'"];
    const dueDate = `coalesce(historical_due.due_date, least(
      bill_keys.bill_month + (coalesce(account.due_date, 1) - 1),
      (bill_keys.bill_month + interval '1 month - 1 day')::date
    ))`;
    const attributionDate =
      filter.dateBasis === 'monthly-review'
        ? 'coalesce(bill_review.review_month, bill_keys.bill_month)'
        : `coalesce(${paymentDate}, payment.calculated_date, payment.to_be_considered_at, ${dueDate})`;

    if (filter.startDate) {
      values.push(filter.startDate.toISOString().slice(0, 10));
      conditions.push(`${attributionDate} >= $${values.length}::date`);
    }
    if (filter.endDate) {
      values.push(filter.endDate.toISOString().slice(0, 10));
      conditions.push(`${attributionDate} <= $${values.length}::date`);
    }
    if (filter.accountId) {
      values.push(filter.accountId);
      conditions.push(`account.id = $${values.length}`);
    }
    if (filter.billMonth) {
      values.push(`${filter.billMonth}-01`);
      conditions.push(`bill_keys.bill_month = $${values.length}::date`);
    }

    const transactionRows = await this.dataSource.query<BillRow[]>(
      `
        WITH bill_keys AS (
          SELECT group_id, bankaccount_id AS credit_account_id,
            date_trunc('month', credit_due_date)::date AS bill_month
          FROM public.transactions
          WHERE group_id = $1 AND removed IS NOT TRUE AND credit_due_date IS NOT NULL
          UNION
          SELECT group_id, credit_account_id, bill_month
          FROM public.credit_card_bill_reconciliations
          WHERE group_id = $1
        )
        SELECT
          account.id AS account_id,
          account.name AS account_name,
          to_char(
            bill_keys.bill_month,
            'YYYY-MM'
          ) AS bill_month,
          ${dueDate}::text AS due_date,
          to_char(coalesce(bill_review.review_month, bill_keys.bill_month), 'YYYY-MM') AS review_month,
          count(transaction_record.id)::integer AS transaction_count,
          round(
            coalesce(sum(transaction_record.value), 0)::numeric,
            2
          )::text AS total,
          reconciliation.id AS reconciliation_id,
          reconciliation.reconciled_bill_total::text,
          payment.id AS payment_transaction_id,
          payment.description AS payment_description,
          payment.value AS payment_value,
          coalesce(
            ${paymentDate},
            payment.calculated_date,
            payment.to_be_considered_at
          )::text AS payment_date,
          payment_account.id AS payment_account_id,
          payment_account.name AS payment_account_name
        FROM bill_keys
        INNER JOIN public.bankaccounts account
          ON account.id = bill_keys.credit_account_id
         AND account.group_id = bill_keys.group_id
        LEFT JOIN public.transactions transaction_record
          ON transaction_record.group_id = bill_keys.group_id
         AND transaction_record.bankaccount_id = bill_keys.credit_account_id
         AND date_trunc('month', transaction_record.credit_due_date)::date = bill_keys.bill_month
         AND transaction_record.removed IS NOT TRUE
        LEFT JOIN LATERAL (
          SELECT coalesce(
            min(history.credit_due_date) FILTER (WHERE history.removed IS NOT TRUE),
            min(history.credit_due_date)
          ) AS due_date
          FROM public.transactions history
          WHERE history.group_id = bill_keys.group_id
            AND history.bankaccount_id = bill_keys.credit_account_id
            AND date_trunc('month', history.credit_due_date)::date = bill_keys.bill_month
        ) historical_due ON true
        LEFT JOIN public.credit_card_bill_reviews bill_review
          ON bill_review.group_id = bill_keys.group_id
         AND bill_review.credit_account_id = account.id
         AND bill_review.bill_month = bill_keys.bill_month
        LEFT JOIN public.credit_card_bill_reconciliations reconciliation
          ON reconciliation.group_id = bill_keys.group_id
         AND reconciliation.credit_account_id = account.id
         AND reconciliation.bill_month = bill_keys.bill_month
        LEFT JOIN public.transactions payment
          ON payment.id = reconciliation.payment_transaction_id
         AND payment.group_id = reconciliation.group_id
         AND payment.removed IS NOT TRUE
         AND payment.value IS NOT NULL
         AND EXISTS (SELECT 1 FROM public.bankaccounts valid_payment_account
           WHERE valid_payment_account.id = payment.bankaccount_id
             AND valid_payment_account.group_id = payment.group_id
             AND valid_payment_account.type = 'checkout')
        LEFT JOIN public.bankaccounts payment_account
          ON payment_account.id = payment.bankaccount_id
         AND payment_account.group_id = payment.group_id
        WHERE ${conditions.join('\n          AND ')}
        GROUP BY
          account.id,
          account.name,
          bill_keys.bill_month,
          historical_due.due_date,
          bill_review.review_month,
          reconciliation.id,
          payment.id,
          payment_account.id,
          payment_account.name
        ORDER BY due_date DESC, account.name ASC
      `,
      values,
    );
    const scheduledRows = await this.findScheduledBillRows(
      groupId,
      filter,
      transactionRows,
    );

    return [...transactionRows, ...scheduledRows].sort(
      (left, right) =>
        right.due_date.localeCompare(left.due_date) ||
        left.account_name.localeCompare(right.account_name),
    );
  }

  private async findScheduledBillRows(
    groupId: string,
    filter: {
      startDate?: Date;
      endDate?: Date;
      accountId?: string;
      billMonth?: string;
      dateBasis?: 'cash-flow' | 'monthly-review';
    },
    transactionRows: BillRow[],
  ): Promise<BillRow[]> {
    const billMonths = this.resolveScheduledBillMonths(filter);
    if (billMonths.length === 0) return [];

    const values: unknown[] = [groupId];
    const conditions = [
      'account.group_id = $1',
      "account.type = 'credit'",
      'account.removed IS NOT TRUE',
      'account.due_date IS NOT NULL',
    ];
    if (filter.accountId) {
      values.push(filter.accountId);
      conditions.push(`account.id = $${values.length}`);
    }

    const accounts = await this.dataSource.query<CreditAccountScheduleRow[]>(
      `
        SELECT
          account.id AS account_id,
          account.name AS account_name,
          account.created_at::date::text AS created_date,
          account.due_date AS due_day,
          group_record.credit_card_review_month_offset AS review_month_offset
        FROM public.bankaccounts account
        INNER JOIN public.groups group_record ON group_record.id = account.group_id
        WHERE ${conditions.join('\n          AND ')}
      `,
      values,
    );
    const assignments = await this.dataSource.query<
      { credit_account_id: string; bill_month: string; review_month: string }[]
    >(
      `
      SELECT credit_account_id, to_char(bill_month, 'YYYY-MM') AS bill_month, to_char(review_month, 'YYYY-MM') AS review_month
      FROM public.credit_card_bill_reviews WHERE group_id = $1
    `,
      [groupId],
    );
    const assignedMonths = new Map(
      assignments.map((row) => [
        `${row.credit_account_id}:${row.bill_month}`,
        row.review_month,
      ]),
    );
    const existingBillKeys = new Set(
      transactionRows.map((row) => `${row.account_id}:${row.bill_month}`),
    );
    // A paid bill can have moved outside this date range. It still must not
    // reappear as an empty forecast on its original due date.
    const activeBillKeys = await this.dataSource.query<
      { account_id: string; bill_month: string }[]
    >(
      `
      SELECT DISTINCT bankaccount_id AS account_id, to_char(credit_due_date, 'YYYY-MM') AS bill_month
      FROM public.transactions
      WHERE group_id = $1 AND removed IS NOT TRUE AND credit_due_date IS NOT NULL
      UNION
      SELECT credit_account_id AS account_id, to_char(bill_month, 'YYYY-MM') AS bill_month
      FROM public.credit_card_bill_reconciliations WHERE group_id = $1
    `,
      [groupId],
    );
    for (const row of activeBillKeys)
      existingBillKeys.add(`${row.account_id}:${row.bill_month}`);
    const startDate = filter.startDate?.toISOString().slice(0, 10);
    const endDate = filter.endDate?.toISOString().slice(0, 10);
    const scheduledRows: BillRow[] = [];

    for (const account of accounts) {
      const accountBillMonths = new Set(billMonths);
      if (filter.dateBasis === 'monthly-review' && !filter.billMonth) {
        for (const month of billMonths)
          accountBillMonths.add(
            shiftReviewMonth(month, -account.review_month_offset),
          );
        for (const assignment of assignments) {
          if (assignment.credit_account_id === account.account_id)
            accountBillMonths.add(assignment.bill_month);
        }
      }
      for (const billMonth of accountBillMonths) {
        const key = `${account.account_id}:${billMonth}`;
        if (existingBillKeys.has(key)) continue;

        const dueDate = deriveBillDueDate(Number(account.due_day), billMonth);
        const reviewMonth =
          assignedMonths.get(key) ??
          shiftReviewMonth(billMonth, account.review_month_offset);
        const attributedDate =
          filter.dateBasis === 'monthly-review' ? `${reviewMonth}-01` : dueDate;
        if (dueDate < account.created_date) continue;
        if (startDate && attributedDate < startDate) continue;
        if (endDate && attributedDate > endDate) continue;

        scheduledRows.push({
          account_id: account.account_id,
          account_name: account.account_name,
          bill_month: billMonth,
          due_date: dueDate,
          review_month: reviewMonth,
          transaction_count: 0,
          total: '0.00',
          reconciliation_id: null,
          reconciled_bill_total: null,
          payment_transaction_id: null,
          payment_description: null,
          payment_value: null,
          payment_date: null,
          payment_account_id: null,
          payment_account_name: null,
        });
      }
    }

    return scheduledRows;
  }

  private resolveScheduledBillMonths(filter: {
    startDate?: Date;
    endDate?: Date;
    billMonth?: string;
  }): string[] {
    if (filter.billMonth) return [filter.billMonth];
    if (!filter.startDate || !filter.endDate) return [];

    const startMonthIndex =
      filter.startDate.getUTCFullYear() * 12 + filter.startDate.getUTCMonth();
    const endMonthIndex =
      filter.endDate.getUTCFullYear() * 12 + filter.endDate.getUTCMonth();
    if (startMonthIndex > endMonthIndex) return [];

    return Array.from(
      { length: endMonthIndex - startMonthIndex + 1 },
      (_, offset) => {
        const monthIndex = startMonthIndex + offset;
        const year = Math.floor(monthIndex / 12);
        const month = (monthIndex % 12) + 1;
        return `${year}-${String(month).padStart(2, '0')}`;
      },
    );
  }

  private async findCandidates(
    groupId: string,
    bill: CreditCardBillSummary,
  ): Promise<CreditCardBillPayment[]> {
    if (bill.status === 'empty') return [];
    const candidateDate = transactionOccurrenceDateSql('candidate', '$4');

    const rows = await this.dataSource.query<CandidateRow[]>(
      `
        SELECT
          candidate.id AS transaction_id,
          candidate.description,
          candidate.value,
          coalesce(
            ${candidateDate},
            candidate.calculated_date,
            candidate.to_be_considered_at
          )::text AS payment_date,
          account.id AS account_id,
          account.name AS account_name
        FROM public.transactions candidate
        INNER JOIN public.bankaccounts account
          ON account.id = candidate.bankaccount_id
         AND account.group_id = candidate.group_id
        WHERE candidate.group_id = $1
          AND candidate.removed IS NOT TRUE
          AND account.type = 'checkout'
          AND candidate.value IS NOT NULL
          AND round(abs(candidate.value::numeric), 2) =
              round(abs($2::numeric), 2)
          AND coalesce(
            ${candidateDate},
            candidate.calculated_date,
            candidate.to_be_considered_at
          ) BETWEEN $3::date - ${RECONCILIATION_WINDOW_DAYS}
                AND $3::date + ${RECONCILIATION_WINDOW_DAYS}
          AND NOT EXISTS (
            SELECT 1
            FROM public.credit_card_bill_reconciliations existing_link
            WHERE existing_link.payment_transaction_id = candidate.id
          )
        ORDER BY
          abs(
            coalesce(
              ${candidateDate},
              candidate.calculated_date,
              candidate.to_be_considered_at
            ) - $3::date
          ),
          candidate.id
      `,
      [groupId, bill.total, bill.dueDate, legacyTimestampTimezone()],
    );
    return rows.map((row) => ({
      transactionId: row.transaction_id,
      description: row.description,
      value: Number(row.value),
      date: row.payment_date,
      accountId: row.account_id,
      accountName: row.account_name,
    }));
  }

  private toSummary(row: BillRow): CreditCardBillSummary {
    const total = Number(row.total);
    const payment = this.toPayment(row);
    return {
      accountId: row.account_id,
      accountName: row.account_name,
      billMonth: row.bill_month,
      dueDate: row.due_date,
      reviewMonth: row.review_month,
      cashFlowDate: payment?.date ?? row.due_date,
      transactionCount: Number(row.transaction_count),
      total,
      status: this.resolveStatus(row, total, payment),
      payment,
    };
  }

  private toPayment(row: BillRow): CreditCardBillPayment | null {
    if (
      !row.payment_transaction_id ||
      row.payment_value === null ||
      !row.payment_date ||
      !row.payment_account_id ||
      !row.payment_account_name
    ) {
      return null;
    }
    return {
      transactionId: row.payment_transaction_id,
      description: row.payment_description,
      value: Number(row.payment_value),
      date: row.payment_date,
      accountId: row.payment_account_id,
      accountName: row.payment_account_name,
    };
  }

  private resolveStatus(
    row: BillRow,
    total: number,
    payment: CreditCardBillPayment | null,
  ): CreditCardBillStatus {
    if (Number(row.transaction_count) === 0 && !row.reconciliation_id) {
      return 'empty';
    }
    if (!row.reconciliation_id) return 'needs-reconciliation';
    if (!payment || row.reconciled_bill_total === null) return 'needs-review';
    if (
      toCents(Number(row.reconciled_bill_total)) !== toCents(total) ||
      toCents(Math.abs(payment.value)) !== toCents(Math.abs(total))
    ) {
      return 'needs-review';
    }
    return 'reconciled';
  }

  private isWithinReconciliationWindow(
    paymentDate: string,
    dueDate: string,
  ): boolean {
    const paymentTime = Date.parse(`${paymentDate}T00:00:00.000Z`);
    const dueTime = Date.parse(`${dueDate}T00:00:00.000Z`);
    return (
      Number.isFinite(paymentTime) &&
      Math.abs(paymentTime - dueTime) <= RECONCILIATION_WINDOW_DAYS * DAY_IN_MS
    );
  }
}
