import { z } from "zod";

export const CATEGORY_ICON_VALUES = [
  "tag",
  "shopping-cart",
  "utensils",
  "car",
  "house",
  "heart-pulse",
  "plane",
  "gamepad-2",
  "briefcase",
  "book-open",
  "coffee",
  "dumbbell",
  "gift",
  "paw-print",
  "shirt",
  "smartphone",
  "music",
  "baby",
  "wrench",
  "wallet-cards",
  "bike",
  "camera",
  "graduation-cap",
  "sparkles"
] as const;

export const CATEGORY_COLOR_VALUES = [
  "yellow",
  "lime",
  "sky",
  "violet",
  "danger",
  "amber",
  "orange",
  "rose",
  "pink",
  "fuchsia",
  "indigo",
  "teal"
] as const;

export const CategoryIconSchema = z.enum(CATEGORY_ICON_VALUES);
export const CategoryColorSchema = z.enum(CATEGORY_COLOR_VALUES);

export const CategoryOutputSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  name: z.string(),
  icon: CategoryIconSchema,
  color: CategoryColorSchema,
  groupId: z.string()
});

export const CategoryListOutputSchema = z.array(CategoryOutputSchema);
export const DeleteCategoryOutputSchema = z.object({ id: z.string() });

export type CategoryOutput = z.infer<typeof CategoryOutputSchema>;
export type CategoryIcon = z.infer<typeof CategoryIconSchema>;
export type CategoryColor = z.infer<typeof CategoryColorSchema>;
