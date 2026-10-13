import { z } from "zod";

export const CreditCardIdSchema = z.string().regex(/^\d+$/);

export const CreditCardSafeLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(
    (value) =>
      ![...value].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
      ),
    {
      message: "Card labels cannot contain control characters"
    }
  )
  .refine(
    (value) => value.normalize("NFKC").replace(/[^0-9]/g, "").length < 8,
    {
      message:
        "Use a nickname or the last four digits, never a full card number"
    }
  );

export const CreditCardLast4Schema = z.string().regex(/^\d{4}$/);

export const CreditCardReferenceSchema = z.object({
  id: CreditCardIdSchema,
  accountId: CreditCardIdSchema,
  name: CreditCardSafeLabelSchema,
  last4: CreditCardLast4Schema.nullable(),
  archived: z.boolean()
});

export const CreditCardOutputSchema = CreditCardReferenceSchema.extend({
  createdAt: z.string().datetime(),
  groupId: CreditCardIdSchema,
  accountName: z.string()
});
export const CreditCardListOutputSchema = z.array(CreditCardOutputSchema);
export const DeleteCreditCardOutputSchema = z.object({
  id: CreditCardIdSchema
});

export const CreateCreditCardInputSchema = z
  .object({
    accountId: CreditCardIdSchema,
    name: CreditCardSafeLabelSchema,
    last4: CreditCardLast4Schema.nullable().optional()
  })
  .strict();

export const UpdateCreditCardInputSchema = CreateCreditCardInputSchema.omit({
  accountId: true
})
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one card field is required"
  });

export const CreditCardQuerySchema = z.object({
  groupId: CreditCardIdSchema,
  accountId: CreditCardIdSchema.optional(),
  includeArchived: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .optional()
});

export type CreditCardReference = z.infer<typeof CreditCardReferenceSchema>;
export type CreditCardOutput = z.infer<typeof CreditCardOutputSchema>;
export type CreateCreditCardInput = z.infer<typeof CreateCreditCardInputSchema>;
export type UpdateCreditCardInput = z.infer<typeof UpdateCreditCardInputSchema>;
export type CreditCardQuery = z.infer<typeof CreditCardQuerySchema>;
