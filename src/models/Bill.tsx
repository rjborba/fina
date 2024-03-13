import { z } from "zod";

const BillSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  description: z.string(),
  value: z.number(),
  dueDay: z.number(),
  totalInstallments: z.number(),
  installment: z.number(),
  purchasedAt: z.date(),
});

export type TBill = {
  id: string;
  createdAt: Date;
  description: string;
  value: number;
  dueDay: number;
  totalInstallments?: number;
  installment?: number;
  purchasedAt: Date;
};
