import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { CategorySchema } from "./Category";

export class CreateCategoryOutputDto extends createZodDto(CategorySchema) {}

export type CreateCategoryOutputDtoType = z.infer<typeof CategorySchema>;
