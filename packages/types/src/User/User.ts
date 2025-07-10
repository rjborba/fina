import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  metaData: z.record(z.unknown()).nullable(),
  avatar: z.string().nullable(),
});

export type User = z.infer<typeof UserSchema>;
