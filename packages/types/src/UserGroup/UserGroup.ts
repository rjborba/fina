import { z } from "zod";

import { GroupSchema } from "../Group/Group.js";
import { UserSchema } from "../User/User.js";

export const UserGroupSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  group: GroupSchema,
  user: UserSchema,
});

export type UserGroup = z.infer<typeof UserGroupSchema>;
