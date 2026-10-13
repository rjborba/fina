import { z } from "zod";

export const BillMonthSchema = z
  .string()
  .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, "Bill month must use YYYY-MM");

export type BillMonth = z.infer<typeof BillMonthSchema>;

export const ReviewMonthsQuerySchema = z
  .any()
  .transform((value: unknown) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value]
  )
  .pipe(
    z
      .array(
        BillMonthSchema.refine((month) => !month.startsWith("0000-"), {
          message: "Review month must use a year from 0001 to 9999"
        })
      )
      .min(1)
      .max(120)
      .optional()
  )
  .transform((months) =>
    months === undefined ? undefined : [...new Set(months)].sort()
  );
