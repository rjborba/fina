import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { BankaccountSchema } from "./Bankaccount.js";

const QueryBankaccountOutputDtoSchema = z.array(BankaccountSchema);

export class QueryBankaccountOutputDto extends createZodDto(
  QueryBankaccountOutputDtoSchema
) {}

export type QueryBankaccountOutputDtoType = z.infer<
  typeof QueryBankaccountOutputDtoSchema
>;
