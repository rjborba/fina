import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const QueryBankaccountInputDtoSchema = z.object({
  groupId: z.string(),
});

export class QueryBankaccountInputDto extends createZodDto(
  QueryBankaccountInputDtoSchema
) {}

export type QueryBankaccountInputDtoType = z.infer<
  typeof QueryBankaccountInputDtoSchema
>;
