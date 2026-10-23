import { z } from "zod";
import { TransactionWriteFieldsSchema } from "./CreateTransaction.input.dto";

export const UpdateTransactionInputDtoSchema =
  TransactionWriteFieldsSchema.omit({ observation: true })
    .extend({
      flagged: z.boolean(),
      bankaccountId: z.string().regex(/^\d+$/).nullable(),
      categoryId: z.string().regex(/^\d+$/).nullable()
    })
    .partial()
    .strict();

export type UpdateTransactionInputDtoType = z.infer<
  typeof UpdateTransactionInputDtoSchema
>;
export type UpdateTransactionInputDto = UpdateTransactionInputDtoType;
