import { z } from "zod";
import { hasInvalidFormulaNameCharacters } from "./formula";
import { CategoryColorSchema } from "../Category/CategoryApi.dto";

const id = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine(
    (value) =>
      /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n,
    "Invalid identifier"
  );
export const CustomValueParamsSchema = z.object({ groupId: id }).strict();
export const CustomValueItemParamsSchema = CustomValueParamsSchema.extend({
  id
});
export const SaveCustomValueSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine(
        (value) => !hasInvalidFormulaNameCharacters(value),
        "Title cannot contain braces or control characters"
      ),
    expression: z.string().trim().min(1).max(16000),
    color: CategoryColorSchema.optional()
  })
  .strict();
export const CustomValueOutputSchema = z.object({
  id,
  groupId: id,
  title: z.string(),
  color: CategoryColorSchema,
  expression: z.string(),
  resolvedExpression: z.string()
});
export const CustomValueListSchema = z.array(CustomValueOutputSchema);
export const DeleteCustomValueSchema = z.object({ id });
export type CustomValue = z.infer<typeof CustomValueOutputSchema>;
export type SaveCustomValue = z.infer<typeof SaveCustomValueSchema>;
export * from "./formula";
