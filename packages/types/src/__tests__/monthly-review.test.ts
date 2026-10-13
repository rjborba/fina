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

  it("normalizes explicit months including gaps and year boundaries", () => {
    for (const schema of [
      QueryTransactionInputDtoSchema,
      CreditCardBillListQuerySchema
    ]) {
      expect(
        schema.parse({
          groupId: "1",
          dateBasis: "monthly-review",
          reviewMonths: ["2027-02", "2026-12", "2027-02"]
        }).reviewMonths
      ).toEqual(["2026-12", "2027-02"]);
      expect(
        schema.parse({
          groupId: "1",
          dateBasis: "monthly-review",
          reviewMonths: "2026-12"
        }).reviewMonths
      ).toEqual(["2026-12"]);
      expect(schema.parse({ groupId: "1" }).reviewMonths).toBeUndefined();
    }
  });

  it("rejects invalid or unbounded month selections and other date bases", () => {
    for (const schema of [
      QueryTransactionInputDtoSchema,
      CreditCardBillListQuerySchema
    ]) {
      for (const reviewMonths of [
        [],
        null,
        ["2026-13"],
        ["0000-12"],
        ["2026-1"],
        ["2026-12-01"],
        [12],
        Array.from({ length: 121 }, () => "2026-12")
      ]) {
        expect(
          schema.safeParse({
            groupId: "1",
            dateBasis: "monthly-review",
            reviewMonths
          }).success
        ).toBe(false);
      }
      for (const dateBasis of [undefined, "cash-flow"]) {
        expect(
          schema.safeParse({
            groupId: "1",
            dateBasis,
            reviewMonths: ["2026-12"]
          }).success
        ).toBe(false);
      }
    }
  });
});
