import { z } from "zod";

export const QueryCategoryInputDtoSchema = z.object({
  groupId: z
    .string()
    .regex(/^\d+$/)
    .describe("The group ID to filter categories")
});

export type QueryCategoryInputDtoType = z.infer<
  typeof QueryCategoryInputDtoSchema
>;
