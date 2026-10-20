import { describe, expect, it } from "vitest";
import {
  CreateTransactionInputDtoSchema,
  QueryTransactionInputDtoSchema,
  CreditCardBillListQuerySchema,
  UpdateTransactionInputDtoSchema
} from "../index";

describe("monthly review contracts", () => {
  it("rejects explicit review assignments on transaction creation and editing", () => {
    const transaction = {
      groupId: "1",
      bankaccountId: "2",
      description: "Synthetic purchase",
      value: -10,
      date: "2026-01-20",
      billMonth: "2026-02"
    };
    expect(CreateTransactionInputDtoSchema.safeParse(transaction).success).toBe(
      true
    );
    expect(
      CreateTransactionInputDtoSchema.safeParse({
        ...transaction,
        reviewMonth: "2026-03"
      }).success
    ).toBe(false);
    expect(
      UpdateTransactionInputDtoSchema.safeParse({ reviewMonth: "2026-03" })
        .success
    ).toBe(false);
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
