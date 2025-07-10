import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const RemoveCategoryInputDtoSchema = z.object({
  id: z.string().describe("The category ID to remove"),
});

export class RemoveCategoryInputDto extends createZodDto(
  RemoveCategoryInputDtoSchema
) {}

export type RemoveCategoryInputDtoType = z.infer<
  typeof RemoveCategoryInputDtoSchema
>;
