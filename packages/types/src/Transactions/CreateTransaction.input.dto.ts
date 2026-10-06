import { z } from "zod";
import { BillMonthSchema } from "../BillMonth";
export const TransactionWriteFieldsSchema = z.object({
  description: z.string().nullable(),
  value: z.number().nullable(),
  date: z.coerce.date().nullable(),
  installmentTotal: z.number().int().nullable().optional(),
  installmentCurrent: z.string().nullable().optional(),
  creditDueDate: z.coerce.date().nullable().optional(),
  observation: z.string().nullable().optional(),
  toBeConsideredAt: z.coerce.date().nullable().optional(),
  calculatedDate: z.coerce.date().nullable().optional()
});

export const CreateTransactionInputDtoSchema =
  TransactionWriteFieldsSchema.omit({
    creditDueDate: true,
    toBeConsideredAt: true,
    calculatedDate: true
  })
    .extend({
      bankaccountId: z.string().regex(/^\d+$/),
      categoryId: z.string().regex(/^\d+$/).nullable().optional(),
      groupId: z.string().regex(/^\d+$/),
      importId: z.string().regex(/^\d+$/).nullable().optional(),
      billMonth: BillMonthSchema.nullable()
    })
    .strict();

export type CreateTransactionInputDtoType = z.infer<
  typeof CreateTransactionInputDtoSchema
>;
export type CreateTransactionInputDto = CreateTransactionInputDtoType;
