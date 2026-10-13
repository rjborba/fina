import { z } from "zod";
import { ReviewMonthsQuerySchema } from "../BillMonth";
import {
  hasValidTransactionValueRange,
  TransactionFilterQueryShape
} from "./TransactionFilters";

export const QueryTransactionInputDtoSchema = z
  .object({
    ...TransactionFilterQueryShape,
    dateBasis: z.enum(["cash-flow", "monthly-review"]).optional(),
    reviewMonths: ReviewMonthsQuerySchema.describe(
      "Explicit review months; overrides date bounds in monthly review"
    ),
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
    accountType: z
      .enum(["checkout", "credit"])
      .optional()
      .describe("Account type to filter by")
  })
  .refine(
    (query) =>
      query.reviewMonths === undefined || query.dateBasis === "monthly-review",
    {
      message: "Review months require monthly-review date basis",
      path: ["reviewMonths"]
    }
  )
  .refine(hasValidTransactionValueRange, {
    message: "Maximum value must be greater than or equal to minimum value",
    path: ["maxValue"]
  });

export type QueryTransactionInputDtoType = z.infer<
  typeof QueryTransactionInputDtoSchema
>;
export type QueryTransactionInputDto = QueryTransactionInputDtoType;
