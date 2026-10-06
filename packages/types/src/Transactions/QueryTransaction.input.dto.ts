import { z } from "zod";

// Transform function to handle array query parameters
const arrayTransform = (val: unknown) => {
  if (val === undefined || val === null) {
    return undefined;
  }
  if (Array.isArray(val)) {
    return val;
  }
  return [val];
};

export const QueryTransactionInputDtoSchema = z.object({
  groupId: z
    .string()
    .regex(/^\d+$/)
    .describe("The group ID to filter transactions"),
  page: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Page number for pagination"),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .describe("Number of items per page (max 5000)"),
  startDate: z.coerce.date().optional().describe("Start date filter"),
  endDate: z.coerce.date().optional().describe("End date filter"),
  categoryIdList: z
    .any()
    .transform(arrayTransform)
    .pipe(
      z.array(z.union([z.string().regex(/^\d+$/), z.literal("-1")])).optional()
    )
    .describe("Array of category IDs to filter by"),
  accountIdList: z
    .any()
    .transform(arrayTransform)
    .pipe(z.array(z.string().regex(/^\d+$/)).optional())
    .describe("Array of account IDs to filter by"),
  accountType: z
    .enum(["checkout", "credit"])
    .optional()
    .describe("Account type to filter by"),
  search: z
    .string()
    .optional()
    .describe("Search term for transaction filtering")
});

export type QueryTransactionInputDtoType = z.infer<
  typeof QueryTransactionInputDtoSchema
>;
export type QueryTransactionInputDto = QueryTransactionInputDtoType;
