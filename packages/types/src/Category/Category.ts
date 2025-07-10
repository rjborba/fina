import { GroupSchema } from "../Group/Group";
import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  name: z.string(),
  group: GroupSchema,
});

export type Category = z.infer<typeof CategorySchema>;
