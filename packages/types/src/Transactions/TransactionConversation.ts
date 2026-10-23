import { z } from "zod";

export const TransactionCommentBodySchema = z.string().trim().min(1).max(4000);
export const AddTransactionCommentSchema = z
  .object({ body: TransactionCommentBodySchema })
  .strict();
export const ResolveTransactionConversationSchema = z
  .object({ resolved: z.boolean() })
  .strict();
export const TransactionConversationSchema = z.object({
  transactionId: z.string(),
  resolved: z.boolean(),
  messages: z.array(
    z.object({
      id: z.string(),
      body: z.string(),
      createdAt: z.string().datetime(),
      author: z
        .object({ id: z.string().uuid(), name: z.string().nullable() })
        .nullable()
    })
  )
});
export type TransactionConversation = z.infer<
  typeof TransactionConversationSchema
>;
