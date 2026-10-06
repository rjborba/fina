import { z } from "zod";
import { createPaginationScheme } from "../pagination";
import { TransactionOutputSchema } from "./TransactionApi.dto";

export const QueryTransactionOutputDtoSchema = createPaginationScheme(
  TransactionOutputSchema
);

export type QueryTransactionOutputDtoType = z.infer<
  typeof QueryTransactionOutputDtoSchema
>;
