import { z } from "zod";

import { GroupSchema } from "../Group/Group.js";

export const InviteSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  email: z.string(),
  pending: z.boolean(),
  group: GroupSchema,
});

export type Invite = z.infer<typeof InviteSchema>;
