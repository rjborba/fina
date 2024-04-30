import { Tables, TablesInsert, TablesUpdate } from "@/supabase/supabase_types";
import { snakeToCamelType } from "@/tools/camelize";
import { z } from "zod";

// export const BillSchemaDTO = z.object({
//   id: z.number(),
//   created_at: z.date(),
//   description: z.string(),
//   category: z.string(),
//   total_installments: z.number(),
//   installment: z.number(),
//   value: z.number(),
//   purchased_at: z.date(),
// });

// export const BillSchema = z.object({
//   id: z.number(),
//   createdAt: z.date(),
//   description: z.string(),
//   category: z.string(),
//   totalInstallments: z.number(),
//   installment: z.number(),
//   value: z.number(),
//   purchasedAt: z.date(),
// });

// export type TBillDTO = z.infer<typeof BillSchemaDTO>;
// export type TBill = z.infer<typeof BillSchema>;
