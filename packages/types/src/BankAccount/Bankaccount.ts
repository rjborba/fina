import { z } from "zod";

import { GroupSchema } from "../Group/Group.js";
import { UserSchema } from "../User/User.js";

export const BankaccountSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  name: z.string(),
  type: z.string(),
  dueDate: z.coerce.date().nullable(),
  group: GroupSchema,
  user: UserSchema,
});

export type Bankaccount = z.infer<typeof BankaccountSchema>;
