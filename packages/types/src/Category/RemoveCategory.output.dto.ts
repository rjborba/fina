import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { CategorySchema } from "./Category";

export class RemoveCategoryOutputDto extends createZodDto(CategorySchema) {}

export type RemoveCategoryOutputDtoType = z.infer<typeof CategorySchema>;
