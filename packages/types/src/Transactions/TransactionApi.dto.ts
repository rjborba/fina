import { z } from "zod";
import {
  CategoryColorSchema,
  CategoryIconSchema
} from "../Category/CategoryApi.dto";
import { BillMonthSchema } from "../BillMonth";
import { CreditCardDueDaySchema } from "../BankAccount/BankaccountApi.dto";
import { FinancialInstitutionIdSchema } from "../BankAccount/FinancialInstitution";
import { CardNameSchema, CardLast4Schema } from "./CardMetadata";

export const TransactionOutputSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  description: z.string().nullable(),
  value: z.number().nullable(),
  cardName: CardNameSchema.nullable(),
  cardLast4: CardLast4Schema.nullable(),
  date: z.string().datetime().nullable(),
  installmentTotal: z.number().nullable(),
  installmentCurrent: z.string().nullable(),
  creditDueDate: z.string().date().nullable(),
  observation: z.string().nullable(),
  toBeConsideredAt: z.string().date().nullable(),
  calculatedDate: z.string().date().nullable(),
  reviewMonth: BillMonthSchema.nullable().describe(
    "Calculated from the preceding bill due month or transaction occurrence month; never stored or editable"
  ),
  cashFlowDate: z.string().date().nullable(),
  cashFlowStatus: z.enum(["scheduled", "confirmed"]).nullable(),
  billPayment: z
    .object({
      creditAccountId: z.string(),
      billMonth: BillMonthSchema
    })
    .nullable(),
  bankaccount: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      institutionId: FinancialInstitutionIdSchema.nullable(),
      dueDate: CreditCardDueDaySchema.nullable()
    })
    .nullable(),
  category: z
    .object({
      id: z.string(),
      name: z.string(),
      icon: CategoryIconSchema,
      color: CategoryColorSchema
    })
    .nullable(),
  group: z.object({ id: z.string(), name: z.string() }),
  import: z.object({ id: z.string(), fileName: z.string() }).nullable()
});

export const DeleteTransactionOutputSchema = z.object({ id: z.string() });

export type TransactionOutput = z.infer<typeof TransactionOutputSchema>;
