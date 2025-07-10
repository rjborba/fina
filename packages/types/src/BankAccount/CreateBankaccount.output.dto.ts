import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { BankaccountSchema } from "./Bankaccount";

export class CreateBankaccountOutputDto extends createZodDto(
  BankaccountSchema
) {}

export type CreateBankaccountOutputDtoType = z.infer<typeof BankaccountSchema>;
