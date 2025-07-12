import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { CreateTransactionInputDtoSchema } from "../Transactions";

const CreateImportInputDtoSchema = z.object({
  fileName: z.string(),
  groupId: z.string(),
  transactions: z.array(
    CreateTransactionInputDtoSchema.omit({ importId: true })
  ),
});

export class CreateImportInputDto extends createZodDto(
  CreateImportInputDtoSchema
) {}

export type CreateImportInputDtoType = z.infer<
  typeof CreateImportInputDtoSchema
>;
