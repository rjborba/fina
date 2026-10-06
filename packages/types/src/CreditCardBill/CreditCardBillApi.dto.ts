import { z } from "zod";
import { BillMonthSchema } from "../BillMonth";
import { TransactionOutputSchema } from "../Transactions/TransactionApi.dto";

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
  accountName: z.string()
});

export const CreditCardBillSummarySchema = z.object({
  accountId: z.string(),
  accountName: z.string(),
  billMonth: BillMonthSchema,
  dueDate: z.string().date(),
  transactionCount: z.number().int().nonnegative(),
  total: z.number(),
  status: CreditCardBillStatusSchema,
  payment: CreditCardBillPaymentSchema.nullable()
});

export const CreditCardBillListOutputSchema = z.array(
  CreditCardBillSummarySchema
);

export const CreditCardBillListQuerySchema = z.object({
  groupId: z.string().regex(/^\d+$/),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
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
  candidates: z.array(CreditCardBillPaymentSchema)
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
