import { z } from "zod";

export const BillMonthSchema = z
  .string()
  .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, "Bill month must use YYYY-MM");

export type BillMonth = z.infer<typeof BillMonthSchema>;
