import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { createPaginationScheme } from "../pagination.js";
import { TransactionSchema } from "./Transaction.js";

const QueryTransactionOutputDtoSchema =
  createPaginationScheme(TransactionSchema);

export class QueryTransactionOutputDto extends createZodDto(
  QueryTransactionOutputDtoSchema
) {}

export type QueryTransactionOutputDtoType = z.infer<
  typeof QueryTransactionOutputDtoSchema
>;
