import { z } from "zod";

import { UserSchema } from "../User/User";

export const GroupSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  name: z.string(),
  creator: UserSchema,
});

export type Group = z.infer<typeof GroupSchema>;
