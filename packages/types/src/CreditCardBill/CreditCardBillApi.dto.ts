import { z } from "zod";
import { BillMonthSchema, ReviewMonthsQuerySchema } from "../BillMonth";
import { TransactionOutputSchema } from "../Transactions/TransactionApi.dto";
import { FinancialInstitutionIdSchema } from "../BankAccount/FinancialInstitution";
import { CardNameSchema, CardLast4Schema } from "../Transactions/CardMetadata";
import {
  hasValidTransactionValueRange,
  TransactionFilterQueryShape
} from "../Transactions/TransactionFilters";

export const CreditCardBillStatusSchema = z.enum([
  "empty",
  "needs-reconciliation",
  "reconciled",
  "needs-review"
]);

export const CreditCardBillPaymentSchema = z.object({
  transactionId: z.string(),
  description: z.string().nullable(),
  value: z.number(),
  date: z.string().date(),
  accountId: z.string(),
  accountName: z.string(),
  accountInstitutionId: FinancialInstitutionIdSchema.nullable()
});

export const CreditCardBillSummarySchema = z.object({
  accountId: z.string(),
  accountName: z.string(),
  accountInstitutionId: FinancialInstitutionIdSchema.nullable(),
  billMonth: BillMonthSchema,
  dueDate: z.string().date(),
  reviewMonth: BillMonthSchema.describe(
    "Calculated as the calendar month before billMonth; never stored or editable"
  ),
  cashFlowDate: z.string().date(),
  transactionCount: z.number().int().nonnegative(),
  total: z.number(),
  matchingTransactionCount: z.number().int().nonnegative().optional(),
  matchingTotal: z.number().finite().optional(),
  status: CreditCardBillStatusSchema,
  payment: CreditCardBillPaymentSchema.nullable()
});

export const CreditCardBillListOutputSchema = z.array(
  CreditCardBillSummarySchema
);

export const CreditCardBillListQuerySchema = z
  .object({
    ...TransactionFilterQueryShape,
    dateBasis: z.enum(["cash-flow", "monthly-review"]).optional(),
    reviewMonths: ReviewMonthsQuerySchema.describe(
      "Explicit review months; overrides date bounds in monthly review"
    ),
    groupId: z.string().regex(/^\d+$/),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional()
  })
  .refine(
    (query) =>
      query.reviewMonths === undefined || query.dateBasis === "monthly-review",
    {
      message: "Review months require monthly-review date basis",
      path: ["reviewMonths"]
    }
  )
  .refine(hasValidTransactionValueRange, {
    message: "Maximum value must be greater than or equal to minimum value",
    path: ["maxValue"]
  });

export const CreditCardBillParamsSchema = z.object({
  accountId: z.string().regex(/^\d+$/),
  billMonth: BillMonthSchema
});

export const CreditCardBillQuerySchema = z.object({
  groupId: z.string().regex(/^\d+$/)
});

export const CreditCardBillDetailSchema = z.object({
  bill: CreditCardBillSummarySchema,
  transactions: z.array(TransactionOutputSchema),
  candidates: z.array(CreditCardBillPaymentSchema),
  cardRoundingAdjustment: z.number().finite(),
  cardSummaries: z.array(
    z.object({
      cardName: CardNameSchema.nullable(),
      cardLast4: CardLast4Schema.nullable(),
      transactionCount: z.number().int().nonnegative(),
      total: z.number().finite(),
      unavailableValueCount: z.number().int().nonnegative()
    })
  )
});

export const ReconcileCreditCardBillInputSchema = z.object({
  groupId: z.string().regex(/^\d+$/),
  paymentTransactionId: z.string().regex(/^\d+$/)
});

export const UnlinkCreditCardBillOutputSchema = z.object({
  accountId: z.string(),
  billMonth: BillMonthSchema
});

export type CreditCardBillStatus = z.infer<typeof CreditCardBillStatusSchema>;
export type CreditCardBillPayment = z.infer<typeof CreditCardBillPaymentSchema>;
export type CreditCardBillSummary = z.infer<typeof CreditCardBillSummarySchema>;
export type CreditCardBillListQuery = z.infer<
  typeof CreditCardBillListQuerySchema
>;
export type CreditCardBillParams = z.infer<typeof CreditCardBillParamsSchema>;
export type CreditCardBillQuery = z.infer<typeof CreditCardBillQuerySchema>;
export type CreditCardBillDetail = z.infer<typeof CreditCardBillDetailSchema>;
export type ReconcileCreditCardBillInput = z.infer<
  typeof ReconcileCreditCardBillInputSchema
>;
