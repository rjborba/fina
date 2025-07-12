import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { ImportSchema } from "./Import";

export class CreateImportOutputDto extends createZodDto(ImportSchema) {}

export type CreateImportOutputDtoType = z.infer<typeof ImportSchema>;
