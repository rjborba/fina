import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { ImportSchema } from "./Import.js";

export class RemoveImportOutputDto extends createZodDto(ImportSchema) {}

export type RemoveImportOutputDtoType = z.infer<typeof ImportSchema>;
