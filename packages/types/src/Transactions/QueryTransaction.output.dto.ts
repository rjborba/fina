import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { createPaginationScheme } from "../pagination";
import { TransactionSchema } from "./Transaction";

const QueryTransactionOutputDtoSchema =
  createPaginationScheme(TransactionSchema);

export class QueryTransactionOutputDto extends createZodDto(
  QueryTransactionOutputDtoSchema
) {}

export type QueryTransactionOutputDtoType = z.infer<
  typeof QueryTransactionOutputDtoSchema
>;
