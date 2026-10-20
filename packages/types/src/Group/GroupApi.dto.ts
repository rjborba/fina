import { z } from "zod";

export const GroupOutputSchema = z.object({
  id: z.string().regex(/^\d+$/),
  createdAt: z.string().datetime(),
  name: z.string(),
  isOwner: z.boolean()
});

export const GroupListOutputSchema = z.array(GroupOutputSchema);

export const CreateGroupInputSchema = z.object({
  name: z.string().trim().min(1).max(120)
});

export const DeleteGroupInputSchema = z.object({
  confirmName: z.string().min(1)
});

export const DeleteGroupOutputSchema = z.object({ id: z.string() });
export const IdParamSchema = z.object({ id: z.string().regex(/^\d+$/) });
export const GroupQueryInputSchema = z.object({
  groupId: z.string().regex(/^\d+$/)
});

export type GroupOutput = z.infer<typeof GroupOutputSchema>;
export type CreateGroupInputDto = z.infer<typeof CreateGroupInputSchema>;
export type DeleteGroupInputDto = z.infer<typeof DeleteGroupInputSchema>;
