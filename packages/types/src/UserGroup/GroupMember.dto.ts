import { z } from "zod";

export const GroupMemberSchema = z.object({
  membershipId: z.string(),
  joinedAt: z.string().datetime(),
  role: z.enum(["owner", "member"]),
  userId: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  avatar: z.string().nullable()
});

export const GroupMemberListOutputSchema = z.array(GroupMemberSchema);

export type GroupMember = z.infer<typeof GroupMemberSchema>;
