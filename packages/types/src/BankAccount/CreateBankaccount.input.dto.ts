import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { BankaccountSchema } from "./Bankaccount.js";

const CreateBankaccountInputDtoSchema = BankaccountSchema.omit({
  id: true,
  createdAt: true,
  group: true,
  user: true,
}).extend({
  groupId: z.string(),
  userId: z.string(),
});

export class CreateBankaccountInputDto extends createZodDto(
  CreateBankaccountInputDtoSchema
) {}

export type CreateBankaccountInputDtoType = z.infer<
  typeof CreateBankaccountInputDtoSchema
>;
