import { z } from "zod";
import { CreditCardDueDaySchema } from "./BankaccountApi.dto";

export const CreateBankaccountInputDtoSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: z.string().trim().min(1).max(40),
    dueDate: CreditCardDueDaySchema.nullable(),
    groupId: z.string().regex(/^\d+$/)
  })
  .strict()
  .superRefine((input, context) => {
    if (input.type === "credit" && input.dueDate === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Credit card due day is required",
        path: ["dueDate"]
      });
    }

    if (input.type !== "credit" && input.dueDate !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due day is only allowed for credit card accounts",
        path: ["dueDate"]
      });
    }
  });

export type CreateBankaccountInputDtoType = z.infer<
  typeof CreateBankaccountInputDtoSchema
>;
export type CreateBankaccountInputDto = CreateBankaccountInputDtoType;
