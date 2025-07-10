import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const QueryCategoryInputDtoSchema = z.object({
  groupId: z.string().describe("The group ID to filter categories"),
});

export class QueryCategoryInputDto extends createZodDto(
  QueryCategoryInputDtoSchema
) {}

export type QueryCategoryInputDtoType = z.infer<
  typeof QueryCategoryInputDtoSchema
>;
