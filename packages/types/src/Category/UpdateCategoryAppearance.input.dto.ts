import { z } from "zod";
import { CategoryColorSchema, CategoryIconSchema } from "./CategoryApi.dto";

export const UpdateCategoryAppearanceInputDtoSchema = z.object({
  icon: CategoryIconSchema,
  color: CategoryColorSchema
});

export type UpdateCategoryAppearanceInputDtoType = z.infer<
  typeof UpdateCategoryAppearanceInputDtoSchema
>;
