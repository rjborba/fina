import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { CategorySchema } from "./Category.js";

const QueryCategoryOutputSchema = z.array(CategorySchema);

export class QueryCategoryOutputDto extends createZodDto(
  QueryCategoryOutputSchema
) {}

export type QueryCategoryOutputDtoType = z.infer<
  typeof QueryCategoryOutputSchema
>;
