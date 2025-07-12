import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { ImportSchema } from "./Import.js";

export class CreateImportOutputDto extends createZodDto(ImportSchema) {}

export type CreateImportOutputDtoType = z.infer<typeof ImportSchema>;
