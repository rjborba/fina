import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { TransactionSchema } from "./Transaction";

export const UpdateTransactionInputDtoSchema = TransactionSchema.omit({
  id: true,
  createdAt: true,
  bankaccount: true,
  category: true,
  group: true,
  import: true,
})
  .extend({
    bankaccountId: z.string(),
    categoryId: z.string(),
    groupId: z.string(),
    importId: z.string(),
  })
  .partial();

export class UpdateTransactionInputDto extends createZodDto(
  UpdateTransactionInputDtoSchema
) {}

export type UpdateTransactionInputDtoType = z.infer<
  typeof UpdateTransactionInputDtoSchema
>;
