import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { TransactionSchema } from "./Transaction";

export const CreateTransactionInputDtoSchema = TransactionSchema.omit({
  id: true,
  createdAt: true,
  bankaccount: true,
  category: true,
  group: true,
  import: true,
}).extend({
  bankaccountId: z.string(),
  categoryId: z.string().nullable().optional(),
  groupId: z.string(),
  importId: z.string().nullable().optional(),
});

export class CreateTransactionInputDto extends createZodDto(
  CreateTransactionInputDtoSchema
) {}

export type CreateTransactionInputDtoType = z.infer<
  typeof CreateTransactionInputDtoSchema
>;
