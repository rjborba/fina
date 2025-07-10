import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { CategorySchema } from "./Category";

const CreateCategoryInputDtoSchema = CategorySchema.omit({
  id: true,
  createdAt: true,
  group: true,
}).extend({
  groupId: z.string(),
});

export class CreateCategoryInputDto extends createZodDto(
  CreateCategoryInputDtoSchema
) {}

export type CreateCategoryInputDtoType = z.infer<
  typeof CreateCategoryInputDtoSchema
>;
