import { z } from "zod";

export const QueryBankaccountInputDtoSchema = z.object({
  groupId: z.string().regex(/^\d+$/)
});

export type QueryBankaccountInputDtoType = z.infer<
  typeof QueryBankaccountInputDtoSchema
>;
