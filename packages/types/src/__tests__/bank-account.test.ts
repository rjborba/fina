import { describe, expect, it } from "vitest";

import {
  BankaccountOutputSchema,
  CreateBankaccountInputDtoSchema,
  FINANCIAL_INSTITUTIONS,
  FinancialInstitutionIdSchema,
  inferFinancialInstitutionId,
  UpdateBankaccountInstitutionInputDtoSchema
} from "../BankAccount";

describe("bank account contracts", () => {
  it("accepts a day-of-month for credit card accounts", () => {
    expect(
      CreateBankaccountInputDtoSchema.parse({
        name: "Main card",
        type: "credit",
        institutionId: null,
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
        institutionId: null,
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

  it("accepts an explicit institution or Other while keeping older clients valid", () => {
    const account = {
      name: "Itaú account",
      type: "checkout",
      dueDate: null,
      groupId: "1"
    };
    expect(CreateBankaccountInputDtoSchema.parse(account)).not.toHaveProperty(
      "institutionId"
    );
    expect(
      CreateBankaccountInputDtoSchema.parse({
        ...account,
        institutionId: "inter"
      }).institutionId
    ).toBe("inter");
    expect(
      CreateBankaccountInputDtoSchema.parse({
        ...account,
        institutionId: null
      }).institutionId
    ).toBeNull();
    expect(
      CreateBankaccountInputDtoSchema.safeParse({
        ...account,
        institutionId: "unlisted"
      }).success
    ).toBe(false);
  });

  it("restricts institution updates to a validated branding choice", () => {
    expect(
      UpdateBankaccountInstitutionInputDtoSchema.parse({
        institutionId: "nubank"
      })
    ).toEqual({ institutionId: "nubank" });
    expect(
      UpdateBankaccountInstitutionInputDtoSchema.parse({ institutionId: null })
    ).toEqual({ institutionId: null });
    for (const input of [
      {},
      { institutionId: "unknown" },
      { institutionId: "inter", groupId: "2" },
      { institutionId: "inter", userId: "forged" },
      { institutionId: "inter", name: "Rename" },
      { institutionId: "inter", type: "credit" },
      { institutionId: "inter", dueDate: 10 }
    ]) {
      expect(
        UpdateBankaccountInstitutionInputDtoSchema.safeParse(input).success
      ).toBe(false);
    }
  });

  it("keeps the catalog complete, unique, and recognizable by its display names", () => {
    expect(FINANCIAL_INSTITUTIONS).toHaveLength(21);
    expect(new Set(FINANCIAL_INSTITUTIONS.map(({ id }) => id)).size).toBe(21);
    for (const { id, name } of FINANCIAL_INSTITUTIONS) {
      expect(FinancialInstitutionIdSchema.parse(id)).toBe(id);
      expect(inferFinancialInstitutionId(`${name} - main card`)).toBe(id);
    }
  });

  it.each([
    ["BANCO ITAÚ (principal)", "itau"],
    ["Itau\u0301 Personnalité", "itau"],
    ["BB Visa", "banco-do-brasil"],
    ["C-6 cartão", "c6"],
    ["PagSeguro cartão", "pagbank"],
    ["Nu Bank", "nubank"],
    ["Banco Votorantim", "banco-bv"],
    ["internet", null],
    ["XPTO", null],
    ["International travel", null],
    ["Personal account", null],
    ["Inter / Itaú", null]
  ])("infers only unambiguous whole-word names: %s", (name, institutionId) => {
    expect(inferFinancialInstitutionId(name!)).toBe(institutionId);
  });
});
