import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { BankaccountSchema } from "./Bankaccount";

const RemoveBankaccountInputDtoSchema = z.array(BankaccountSchema);

export class RemoveBankaccountInputDto extends createZodDto(
  RemoveBankaccountInputDtoSchema
) {}

export type RemoveBankaccountInputDtoType = z.infer<
  typeof RemoveBankaccountInputDtoSchema
>;
