import { z } from "zod";

import { Bankaccount, BankaccountSchema } from "../BankAccount/Bankaccount";
import { Category, CategorySchema } from "../Category/Category";
import { Group, GroupSchema } from "../Group/Group";
import { Import, ImportSchema } from "../Import/Import";

export type Transaction = {
  id: string;
  createdAt: Date;
  description: string | null;
  value: number | null;
  date: Date | null;
  installmentTotal?: number | null;
  installmentCurrent?: string | null;
  creditDueDate?: Date | null;
  observation?: string | null;
  removed?: boolean | null;
  toBeConsideredAt?: string | null;
  calculatedDate?: Date | null;
  bankaccount: Bankaccount;
  category?: Category | null;
  group: Group;
  import?: Import | null;
};

// Transaction schema
export const TransactionSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  description: z.string().nullable(),
  value: z.number().nullable(),
  date: z.coerce.date().nullable(),
  installmentTotal: z.number().nullable().optional(),
  installmentCurrent: z.string().nullable().optional(),
  creditDueDate: z.coerce.date().nullable().optional(),
  observation: z.string().nullable().optional(),
  removed: z.boolean().nullable().optional(),
  toBeConsideredAt: z.string().nullable().optional(),
  calculatedDate: z.coerce.date().nullable().optional(),
  bankaccount: BankaccountSchema,
  category: CategorySchema.nullable().optional(),
  group: GroupSchema,
  get import() {
    return ImportSchema.nullable().optional();
  },
}) satisfies z.ZodType<Transaction>;
