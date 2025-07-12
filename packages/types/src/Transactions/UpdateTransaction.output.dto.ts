import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { TransactionSchema } from "./Transaction";

export class UpdateTransactionOutputDto extends createZodDto(
  TransactionSchema
) {}

export type UpdateTransactionOutputDtoType = z.infer<typeof TransactionSchema>;
