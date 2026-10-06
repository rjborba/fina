import { describe, expect, it } from "vitest";
import {
  CreditCardBillListQuerySchema,
  CreditCardBillSummarySchema,
  ReconcileCreditCardBillInputSchema
} from "../CreditCardBill";

describe("credit card bill contracts", () => {
  it("accepts a derived bill summary and reconciliation input", () => {
    expect(
      CreditCardBillSummarySchema.parse({
        accountId: "4",
        accountName: "Main card",
        billMonth: "2026-06",
        dueDate: "2026-06-05",
        transactionCount: 3,
        total: -120,
        status: "needs-reconciliation",
        payment: null
      })
    ).toMatchObject({ billMonth: "2026-06" });
    expect(
      ReconcileCreditCardBillInputSchema.safeParse({
        groupId: "2",
        paymentTransactionId: "8"
      }).success
    ).toBe(true);
  });

  it("accepts an empty scheduled bill", () => {
    expect(
      CreditCardBillSummarySchema.parse({
        accountId: "4",
        accountName: "Main card",
        billMonth: "2026-12",
        dueDate: "2026-12-05",
        transactionCount: 0,
        total: 0,
        status: "empty",
        payment: null
      })
    ).toMatchObject({ status: "empty", transactionCount: 0, total: 0 });
  });

  it("rejects malformed bill months and tenant identifiers", () => {
    expect(
      CreditCardBillListQuerySchema.safeParse({ groupId: "other" }).success
    ).toBe(false);
    expect(
      CreditCardBillSummarySchema.safeParse({
        accountId: "4",
        accountName: "Main card",
        billMonth: "June 2026",
        dueDate: "2026-06-05",
        transactionCount: 3,
        total: -120,
        status: "needs-reconciliation",
        payment: null
      }).success
    ).toBe(false);
  });
});
