import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { TransactionSchema } from "./Transaction";

export class CreateTransactionOutputDto extends createZodDto(
  TransactionSchema
) {}

export type CreateTransactionOutputDtoType = z.infer<typeof TransactionSchema>;
