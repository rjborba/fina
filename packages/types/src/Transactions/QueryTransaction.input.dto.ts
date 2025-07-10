import { z } from "zod";
import { createZodDto } from "nestjs-zod";

export const QueryTransactionInputDtoSchema = z.object({
  groupId: z.string().describe("The group ID to filter transactions"),
  page: z.coerce.number().optional().describe("Page number for pagination"),
  pageSize: z.coerce
    .number()
    .optional()
    .describe("Number of items per page (max 5000)"),
  startDate: z.coerce.date().optional().describe("Start date filter"),
  endDate: z.coerce.date().optional().describe("End date filter"),
  categoryIdList: z
    .array(z.string())
    .optional()
    .describe("Array of category IDs to filter by"),
  accountIdList: z
    .array(z.string())
    .optional()
    .describe("Array of account IDs to filter by"),
  search: z
    .string()
    .optional()
    .describe("Search term for transaction filtering"),
});

export class QueryTransactionInputDto extends createZodDto(
  QueryTransactionInputDtoSchema
) {}

export type QueryTransactionInputDtoType = z.infer<
  typeof QueryTransactionInputDtoSchema
>;
