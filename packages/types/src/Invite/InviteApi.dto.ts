import { z } from "zod";

export const InviteOutputSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  email: z.string().email(),
  pending: z.boolean(),
  groupId: z.string(),
  groupName: z.string()
});

export const InviteListOutputSchema = z.array(InviteOutputSchema);

export const CreateInviteInputSchema = z.object({
  groupId: z.string().regex(/^\d+$/),
  email: z.string().trim().toLowerCase().email()
});

export const DeleteInviteOutputSchema = z.object({ id: z.string() });
export const AcceptInviteOutputSchema = z.object({ groupId: z.string() });

export type InviteOutput = z.infer<typeof InviteOutputSchema>;
export type CreateInviteInputDto = z.infer<typeof CreateInviteInputSchema>;
