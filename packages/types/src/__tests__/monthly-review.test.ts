import { describe, expect, it } from "vitest";
import {
  UpdateGroupReviewSettingsInputSchema,
  UpdateCreditCardBillReviewMonthInputSchema,
  QueryTransactionInputDtoSchema,
  CreditCardBillListQuerySchema,
  UpdateTransactionInputDtoSchema
} from "../index";

describe("monthly review contracts", () => {
  it("permits only supported group defaults and rejects client identity", () => {
    for (const offset of [0, -1]) {
      expect(
        UpdateGroupReviewSettingsInputSchema.safeParse({
          creditCardReviewMonthOffset: offset
        }).success
      ).toBe(true);
    }
    expect(
      UpdateGroupReviewSettingsInputSchema.safeParse({
        creditCardReviewMonthOffset: 1
      }).success
    ).toBe(false);
    expect(
      UpdateGroupReviewSettingsInputSchema.safeParse({
        creditCardReviewMonthOffset: -1,
        userId: "3"
      }).success
    ).toBe(false);
  });

  it("validates explicit reference months independently of bill month", () => {
    expect(
      UpdateCreditCardBillReviewMonthInputSchema.parse({
        groupId: "1",
        reviewMonth: "2026-06"
      })
    ).toEqual({ groupId: "1", reviewMonth: "2026-06" });
    expect(
      UpdateCreditCardBillReviewMonthInputSchema.safeParse({
        groupId: "1",
        reviewMonth: "2026-13"
      }).success
    ).toBe(false);
    expect(
      UpdateTransactionInputDtoSchema.parse({ reviewMonth: "2026-06" })
        .reviewMonth
    ).toBe("2026-06");
  });

  it("allows the same explicit date basis on both ledger presentations", () => {
    for (const schema of [
      QueryTransactionInputDtoSchema,
      CreditCardBillListQuerySchema
    ]) {
      expect(
        schema.parse({ groupId: "1", dateBasis: "monthly-review" }).dateBasis
      ).toBe("monthly-review");
      expect(
        schema.parse({ groupId: "1", dateBasis: "cash-flow" }).dateBasis
      ).toBe("cash-flow");
      expect(
        schema.safeParse({ groupId: "1", dateBasis: "purchase-date" }).success
      ).toBe(false);
    }
  });
});
