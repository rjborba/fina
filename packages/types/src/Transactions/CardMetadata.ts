import { z } from "zod";

// These are statement labels, not card identities or payment credentials.
export const CardNameSchema = z
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
    "Card names cannot contain control characters"
  )
  .refine(
    (value) => value.normalize("NFKC").replace(/[^0-9]/g, "").length < 8,
    "Use a card name, never a full card number"
  );
export const CardLast4Schema = z.string().regex(/^\d{4}$/);
export const ImportCardLast4CellSchema = z
  .string()
  .trim()
  .transform((value) => {
    if (!value) return null;
    // Accept an explicitly masked export, but never truncate a full number.
    return value.replace(/^[xX*•●·\s-]+/, "").trim();
  })
  .pipe(CardLast4Schema.nullable());
export const CardMetadataSchema = z.object({
  cardName: CardNameSchema.nullable(),
  cardLast4: CardLast4Schema.nullable()
});
export type CardMetadata = z.infer<typeof CardMetadataSchema>;

export function cardMetadataKey(card: CardMetadata): string {
  return card.cardName === null && card.cardLast4 === null
    ? "-1"
    : JSON.stringify([card.cardName, card.cardLast4]);
}

const CardTupleSchema = z.tuple([
  CardNameSchema.nullable(),
  CardLast4Schema.nullable()
]);
export function parseCardMetadataKey(value: string): CardMetadata | null {
  if (value === "-1") return { cardName: null, cardLast4: null };
  try {
    const result = CardTupleSchema.safeParse(JSON.parse(value));
    if (!result.success) return null;
    const [cardName, cardLast4] = result.data;
    const metadata = { cardName, cardLast4 };
    return cardMetadataKey(metadata) === value ? metadata : null;
  } catch {
    return null;
  }
}

export const CardFilterValueSchema = z
  .string()
  .max(200)
  .refine(
    (value) => parseCardMetadataKey(value) !== null,
    "Choose valid transaction card details"
  );
export const TransactionCardValuesQuerySchema = z.object({
  groupId: z.string().regex(/^\d+$/),
  accountId: z.string().regex(/^\d+$/).optional()
});
export const TransactionCardValuesOutputSchema = z.array(CardMetadataSchema);
