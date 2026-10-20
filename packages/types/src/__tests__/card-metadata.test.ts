import { describe, expect, it } from "vitest";
import {
  CardNameSchema,
  CardLast4Schema,
  ImportCardLast4CellSchema,
  CardFilterValueSchema,
  cardMetadataKey,
  parseCardMetadataKey,
  UpdateTransactionInputDtoSchema,
  ImportMappingConfigSchema,
  QueryTransactionInputDtoSchema,
  CreditCardBillListQuerySchema
} from "../index";

describe("transaction card metadata", () => {
  it("stores optional labels and string digits, preserving leading zeros and rejecting payment credentials", () => {
    expect(
      UpdateTransactionInputDtoSchema.parse({
        cardName: " Personal ",
        cardLast4: "0042"
      })
    ).toEqual({ cardName: "Personal", cardLast4: "0042" });
    expect(
      UpdateTransactionInputDtoSchema.parse({ cardName: null, cardLast4: null })
    ).toEqual({ cardName: null, cardLast4: null });
    for (const name of [
      "",
      "invalid\nlabel",
      "1".repeat(16),
      "\uFF11".repeat(16),
      "\u2460".repeat(16),
      ...["/", "|", ":", "letters"].map((separator) =>
        Array(4).fill("1111").join(separator)
      )
    ]) {
      expect(CardNameSchema.safeParse(name).success).toBe(false);
    }
    for (const last4 of [
      "123",
      "12345",
      1234,
      "ABCD",
      "\uFF11\uFF12\uFF13\uFF14"
    ])
      expect(CardLast4Schema.safeParse(last4).success).toBe(false);
    expect(
      UpdateTransactionInputDtoSchema.safeParse({ creditCardId: "1" }).success
    ).toBe(false);
  });

  it("accepts explicitly masked source digits without silently truncating full numbers", () => {
    for (const value of ["0042", "**** 0042", "XXXX-XXXX-XXXX-0042", "••0042"])
      expect(ImportCardLast4CellSchema.parse(value)).toBe("0042");
    expect(ImportCardLast4CellSchema.parse(" ")).toBeNull();
    for (const value of [
      "1".repeat(16),
      "1111 1111 1111 1111",
      "invalid",
      "123"
    ])
      expect(ImportCardLast4CellSchema.safeParse(value).success).toBe(false);
  });

  it("uses validated metadata pairs, not IDs, for both purchase and bill filters", () => {
    const card = { cardName: "Personal", cardLast4: "0042" };
    const key = cardMetadataKey(card);
    expect(parseCardMetadataKey(key)).toEqual(card);
    expect(cardMetadataKey({ cardName: null, cardLast4: null })).toBe("-1");
    for (const schema of [
      QueryTransactionInputDtoSchema,
      CreditCardBillListQuerySchema
    ]) {
      expect(
        schema.parse({ groupId: "1", cardList: [key, "-1"] }).cardList
      ).toEqual([key, "-1"]);
      expect(schema.parse({ groupId: "1", cardList: key }).cardList).toEqual([
        key
      ]);
    }
    for (const value of [
      "123",
      "[null,null]",
      "{bad}",
      JSON.stringify(["1".repeat(16), "1234"])
    ])
      expect(CardFilterValueSchema.safeParse(value).success).toBe(false);
  });

  it("maps name and number columns independently and rejects obsolete card-assignment mappings", () => {
    const mapping = {
      version: 1,
      delimiter: ";",
      encoding: "utf-8",
      hasHeader: true,
      dateFormat: "DD/MM/YYYY",
      numberFormat: "decimal-comma",
      dateColumn: 0,
      descriptionColumns: [1],
      installmentColumn: null,
      amountMode: "signed",
      amountColumn: 2,
      debitColumn: null,
      creditColumn: null,
      chargesPositive: false
    };
    expect(ImportMappingConfigSchema.parse(mapping)).toEqual(mapping);
    expect(
      ImportMappingConfigSchema.parse({
        ...mapping,
        cardNameColumn: 3,
        cardLast4Column: 4
      })
    ).toMatchObject({ cardNameColumn: 3, cardLast4Column: 4 });
    expect(
      ImportMappingConfigSchema.safeParse({
        ...mapping,
        creditCardColumn: 3,
        creditCardMappings: []
      }).success
    ).toBe(false);
  });
});
