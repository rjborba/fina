import { describe, expect, it } from "vitest";

import {
  BankaccountOutputSchema,
  CreateBankaccountInputDtoSchema
} from "../BankAccount";

describe("bank account contracts", () => {
  it("accepts a day-of-month for credit card accounts", () => {
    expect(
      CreateBankaccountInputDtoSchema.parse({
        name: "Main card",
        type: "credit",
        dueDate: 5,
        groupId: "1"
      })
    ).toMatchObject({ dueDate: 5 });

    expect(
      BankaccountOutputSchema.parse({
        id: "1",
        createdAt: "2026-09-29T00:00:00.000Z",
        name: "Main card",
        type: "credit",
        dueDate: 5,
        groupId: "1",
        userId: "d1b9de9a-3d71-4f8e-8af8-e81d8d173a69"
      }).dueDate
    ).toBe(5);
  });

  it.each([0, 32, "5", "2026-09-05", null])(
    "rejects invalid credit card due day %p",
    (dueDate) => {
      expect(
        CreateBankaccountInputDtoSchema.safeParse({
          name: "Main card",
          type: "credit",
          dueDate,
          groupId: "1"
        }).success
      ).toBe(false);
    }
  );

  it("rejects a due day for a checking account", () => {
    expect(
      CreateBankaccountInputDtoSchema.safeParse({
        name: "Checking",
        type: "checkout",
        dueDate: 5,
        groupId: "1"
      }).success
    ).toBe(false);
  });
});
