import { z } from "zod";
import { FinancialInstitutionIdSchema } from "./FinancialInstitution";

export const UpdateBankaccountInstitutionInputDtoSchema = z
  .object({ institutionId: FinancialInstitutionIdSchema.nullable() })
  .strict();

export type UpdateBankaccountInstitutionInputDto = z.infer<
  typeof UpdateBankaccountInstitutionInputDtoSchema
>;
