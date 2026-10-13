import { describe, expect, it } from "vitest";
import {
  CreditCardBillListQuerySchema,
  CreditCardBillDetailSchema,
  CreditCardBillSummarySchema,
  ReconcileCreditCardBillInputSchema
} from "../CreditCardBill";

describe("credit card bill contracts", () => {
  it("requires an explicit finite per-card rounding adjustment in bill detail", () => {
    const detail = {
      bill: {
        accountId: "4",
        accountName: "Main card",
        accountInstitutionId: null,
        billMonth: "2026-06",
        dueDate: "2026-06-05",
        reviewMonth: "2026-05",
        cashFlowDate: "2026-06-05",
        transactionCount: 0,
        total: 0,
        status: "empty",
        payment: null
      },
      transactions: [],
      candidates: [],
      cardSummaries: []
    };
    expect(
      CreditCardBillDetailSchema.parse({ ...detail, cardRoundingAdjustment: 0 })
        .cardRoundingAdjustment
    ).toBe(0);
    expect(CreditCardBillDetailSchema.safeParse(detail).success).toBe(false);
    expect(
      CreditCardBillDetailSchema.safeParse({
        ...detail,
        cardRoundingAdjustment: Infinity
      }).success
    ).toBe(false);
  });
  it("accepts a derived bill summary and reconciliation input", () => {
    expect(
      CreditCardBillSummarySchema.parse({
        accountId: "4",
        accountName: "Main card",
        accountInstitutionId: "inter",
        billMonth: "2026-06",
        dueDate: "2026-06-05",
        reviewMonth: "2026-05",
        cashFlowDate: "2026-06-05",
        transactionCount: 3,
        total: -120,
        matchingTransactionCount: 1,
        matchingTotal: -35,
        status: "needs-reconciliation",
        payment: null
      })
    ).toMatchObject({
      billMonth: "2026-06",
      total: -120,
      matchingTransactionCount: 1,
      matchingTotal: -35
    });
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
        accountInstitutionId: null,
        billMonth: "2026-12",
        dueDate: "2026-12-05",
        reviewMonth: "2026-11",
        cashFlowDate: "2026-12-05",
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
        accountInstitutionId: null,
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
