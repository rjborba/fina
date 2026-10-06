import { z } from "zod";
import { TransactionWriteFieldsSchema } from "./CreateTransaction.input.dto";

export const UpdateTransactionInputDtoSchema =
  TransactionWriteFieldsSchema.extend({
    bankaccountId: z.string().regex(/^\d+$/).nullable(),
    categoryId: z.string().regex(/^\d+$/).nullable()
  }).partial();

export type UpdateTransactionInputDtoType = z.infer<
  typeof UpdateTransactionInputDtoSchema
>;
export type UpdateTransactionInputDto = UpdateTransactionInputDtoType;
