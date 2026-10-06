import { z } from "zod";
import { CategoryColorSchema, CategoryIconSchema } from "./CategoryApi.dto";

export const CreateCategoryInputDtoSchema = z.object({
  name: z.string().trim().min(1).max(120),
  icon: CategoryIconSchema.default("tag"),
  color: CategoryColorSchema.default("yellow"),
  groupId: z.string().regex(/^\d+$/)
});

export type CreateCategoryInputDtoType = z.infer<
  typeof CreateCategoryInputDtoSchema
>;
