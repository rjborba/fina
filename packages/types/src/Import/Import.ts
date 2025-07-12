import { z } from "zod";

import { Group, GroupSchema } from "../Group/Group";
import { Transaction, TransactionSchema } from "../Transactions/Transaction";

export type Import = {
  id: string;
  createdAt: Date;
  fileName: string;
  group: Group;
  transactions: Transaction[];
};

export const ImportSchema: z.ZodType<Import> = z.object({
  id: z.string(),
  createdAt: z.date(),
  fileName: z.string(),
  group: GroupSchema,
  get transactions() {
    return z.array(z.lazy<typeof TransactionSchema>(() => TransactionSchema));
  },
});
