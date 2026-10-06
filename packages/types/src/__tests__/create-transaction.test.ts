import { describe, expect, it } from "vitest";
import { CreateTransactionInputDtoSchema } from "../index";

const validPayload = {
  groupId: "1",
  bankaccountId: "2",
  categoryId: null,
  billMonth: null,
  date: "2026-09-20",
  description: "Synthetic transaction",
  value: 10,
  installmentCurrent: null,
  installmentTotal: null,
  observation: null
};

describe("create transaction contract", () => {
  it("accepts a bill month and rejects client-derived due dates", () => {
    expect(
      CreateTransactionInputDtoSchema.safeParse({
        ...validPayload,
        billMonth: "2026-10"
      }).success
    ).toBe(true);
    expect(
      CreateTransactionInputDtoSchema.safeParse({
        ...validPayload,
        creditDueDate: "2026-10-05"
      }).success
    ).toBe(false);
  });
});
