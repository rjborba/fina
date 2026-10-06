import { z } from "zod";

export const CreditCardDueDaySchema = z.number().int().min(1).max(31);

export const BankaccountOutputSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  name: z.string(),
  type: z.string(),
  dueDate: CreditCardDueDaySchema.nullable(),
  groupId: z.string(),
  userId: z.string().uuid()
});

export const BankaccountListOutputSchema = z.array(BankaccountOutputSchema);
export const DeleteBankaccountOutputSchema = z.object({ id: z.string() });

export type BankaccountOutput = z.infer<typeof BankaccountOutputSchema>;
