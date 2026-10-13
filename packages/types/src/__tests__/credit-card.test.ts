import { describe, expect, it } from "vitest";
import {
  CreateCreditCardInputSchema,
  CreditCardQuerySchema,
  CreditCardSafeLabelSchema,
  UpdateCreditCardInputSchema,
  CreateTransactionInputDtoSchema,
  UpdateTransactionInputDtoSchema,
  QueryTransactionInputDtoSchema,
  CreditCardBillListQuerySchema,
  ImportMappingConfigSchema,
  NormalizedImportRowSchema
} from "../index";

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

describe("individual card contracts", () => {
  it("allows only nickname, optional last4, and the parent on creation", () => {
    expect(
      CreateCreditCardInputSchema.parse({
        accountId: "1",
        name: "  Mine – virtual  "
      })
    ).toEqual({ accountId: "1", name: "Mine – virtual" });
    expect(
      CreateCreditCardInputSchema.parse({
        accountId: "1",
        name: "Spouse",
        last4: "1234"
      })
    ).toMatchObject({ last4: "1234" });
    for (const extra of [
      { groupId: "2" },
      { userId: "forged" },
      { number: "1".repeat(16) },
      { cvv: "123" },
      { expiry: "12/30" },
      { archived: true }
    ]) {
      expect(
        CreateCreditCardInputSchema.safeParse({
          accountId: "1",
          name: "Mine",
          ...extra
        }).success
      ).toBe(false);
    }
    const separatedNumbers = ["/", "|", ":", "_", "–", "letters"].map(
      (separator) => Array(4).fill("1".repeat(4)).join(separator)
    );
    for (const name of [
      "",
      "invalid\nlabel",
      "1".repeat(16),
      "\uFF11".repeat(16),
      "\u2460".repeat(16),
      "1111 1111 1111 1111",
      ...separatedNumbers
    ]) {
      expect(CreditCardSafeLabelSchema.safeParse(name).success).toBe(false);
    }
    expect(
      CreateCreditCardInputSchema.parse({
        accountId: "1",
        name: "Mine – virtual 2026",
        last4: "1234"
      })
    ).toMatchObject({ name: "Mine – virtual 2026", last4: "1234" });
    for (const last4 of [
      "123",
      "12345",
      1234,
      "ABCD",
      "\uFF11\uFF12\uFF13\uFF14"
    ]) {
      expect(
        CreateCreditCardInputSchema.safeParse({
          accountId: "1",
          name: "Mine",
          last4
        }).success
      ).toBe(false);
    }
  });

  it("requires a strict nonempty update and does not allow moving cards", () => {
    expect(
      UpdateCreditCardInputSchema.parse({ name: "Replacement", last4: null })
    ).toEqual({ name: "Replacement", last4: null });
    for (const input of [
      {},
      { accountId: "2" },
      { name: "Mine", groupId: "2" },
      { last4: "1234", archived: true }
    ]) {
      expect(UpdateCreditCardInputSchema.safeParse(input).success).toBe(false);
    }
  });

  it("parses explicit false correctly for historical-card lists", () => {
    expect(
      CreditCardQuerySchema.parse({ groupId: "1", includeArchived: "false" })
        .includeArchived
    ).toBe(false);
    expect(
      CreditCardQuerySchema.parse({ groupId: "1", includeArchived: "true" })
        .includeArchived
    ).toBe(true);
    expect(
      CreditCardQuerySchema.safeParse({ groupId: "1", includeArchived: "0" })
        .success
    ).toBe(false);
  });

  it("keeps old manual writes valid and permits explicit assignment or clearing", () => {
    const transaction = {
      groupId: "1",
      bankaccountId: "2",
      billMonth: "2026-07",
      description: "Synthetic",
      value: -10,
      date: "2026-06-20"
    };
    expect(CreateTransactionInputDtoSchema.safeParse(transaction).success).toBe(
      true
    );
    expect(
      CreateTransactionInputDtoSchema.parse({
        ...transaction,
        creditCardId: "3"
      }).creditCardId
    ).toBe("3");
    expect(
      UpdateTransactionInputDtoSchema.parse({ creditCardId: null })
    ).toEqual({ creditCardId: null });
    expect(
      UpdateTransactionInputDtoSchema.safeParse({ creditCardId: "forged" })
        .success
    ).toBe(false);
  });

  it("supports the same card filter on individual purchases and grouped bills", () => {
    for (const schema of [
      QueryTransactionInputDtoSchema,
      CreditCardBillListQuerySchema
    ]) {
      expect(
        schema.parse({ groupId: "1", creditCardIdList: ["2", "-1"] })
          .creditCardIdList
      ).toEqual(["2", "-1"]);
      expect(
        schema.parse({ groupId: "1", creditCardIdList: "-1" }).creditCardIdList
      ).toEqual(["-1"]);
      expect(
        schema.safeParse({ groupId: "1", creditCardIdList: "other" }).success
      ).toBe(false);
    }
  });

  it("extends version-one import mappings without rewriting old profiles", () => {
    expect(ImportMappingConfigSchema.parse(mapping)).toEqual(mapping);
    expect(
      ImportMappingConfigSchema.parse({
        ...mapping,
        creditCardColumn: 3,
        creditCardMappings: [
          { value: "**** 1234", creditCardId: "2" },
          { value: "Unidentified", creditCardId: null }
        ]
      }).creditCardMappings
    ).toHaveLength(2);
    for (const extra of [
      {
        creditCardColumn: null,
        creditCardMappings: [{ value: "Mine", creditCardId: "2" }]
      },
      {
        creditCardColumn: 3,
        creditCardMappings: [
          { value: " Mine ", creditCardId: "2" },
          { value: "Mine", creditCardId: null }
        ]
      },
      {
        creditCardColumn: 3,
        creditCardMappings: [{ value: "1".repeat(16), creditCardId: "2" }]
      },
      {
        creditCardColumn: 3,
        creditCardMappings: [{ value: "\uFF11".repeat(16), creditCardId: "2" }]
      },
      {
        creditCardColumn: 3,
        creditCardMappings: [{ value: "\u2460".repeat(16), creditCardId: "2" }]
      },
      ...["/", "|", ":", "letters"].map((separator) => ({
        creditCardColumn: 3,
        creditCardMappings: [
          {
            value: Array(4).fill("1".repeat(4)).join(separator),
            creditCardId: "2"
          }
        ]
      }))
    ])
      expect(
        ImportMappingConfigSchema.safeParse({ ...mapping, ...extra }).success
      ).toBe(false);
    expect(
      NormalizedImportRowSchema.parse({
        sourceRow: 2,
        date: "2026-06-20",
        amount: -10,
        description: null,
        installmentCurrent: null,
        installmentTotal: null,
        creditCardId: null,
        creditCardIdentifier: null
      }).creditCardId
    ).toBeNull();
  });
});
