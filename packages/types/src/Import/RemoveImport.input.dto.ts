import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const RemoveImportInputDtoSchema = z.object({
  id: z.string().describe("The import ID to remove"),
});

export class RemoveImportInputDto extends createZodDto(
  RemoveImportInputDtoSchema
) {}

export type RemoveImportInputDtoType = z.infer<
  typeof RemoveImportInputDtoSchema
>;
