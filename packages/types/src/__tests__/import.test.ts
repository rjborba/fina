import { describe, expect, it } from "vitest";
import {
  CreateBankaccountInputDtoSchema,
  CreateImportInputDtoSchema,
  IMPORT_LIMITS
} from "../index";

const validPayload = {
  groupId: "1",
  accountId: "2",
  billMonth: null,
  fileName: "statement.csv",
  fileSize: 100,
  fileHash: "a".repeat(64),
  sourceFingerprint: "b".repeat(64),
  excludedRowCount: 0,
  config: {
    version: 1 as const,
    delimiter: ";" as const,
    encoding: "utf-8" as const,
    hasHeader: true,
    dateFormat: "DD/MM/YYYY" as const,
    numberFormat: "decimal-comma" as const,
    dateColumn: 0,
    descriptionColumns: [1],
    installmentColumn: null,
    amountMode: "signed" as const,
    amountColumn: 2,
    debitColumn: null,
    creditColumn: null,
    chargesPositive: false
  },
  rows: [
    {
      sourceRow: 7,
      date: "2026-08-31",
      amount: -12.5,
      description: "Synthetic purchase",
      installmentCurrent: null,
      installmentTotal: null
    }
  ]
};

describe("import contracts", () => {
  it("accepts one strict normalized account-scoped payload", () => {
    expect(CreateImportInputDtoSchema.parse(validPayload)).toEqual(
      validPayload
    );
  });

  it("rejects invalid calendar dates, duplicate source lines, and unsafe metadata", () => {
    expect(
      CreateImportInputDtoSchema.safeParse({
        ...validPayload,
        fileName: "bad\nname.csv",
        rows: [
          { ...validPayload.rows[0], date: "2026-02-31" },
          { ...validPayload.rows[0] }
        ]
      }).success
    ).toBe(false);
    expect(
      CreateImportInputDtoSchema.safeParse({
        ...validPayload,
        fileName: "statement.txt"
      }).success
    ).toBe(false);
  });

  it("enforces centralized byte and row limits", () => {
    expect(
      CreateImportInputDtoSchema.safeParse({
        ...validPayload,
        fileSize: IMPORT_LIMITS.maxFileBytes + 1
      }).success
    ).toBe(false);
  });

  it("accepts a bill month and rejects invalid month values", () => {
    expect(
      CreateImportInputDtoSchema.safeParse({
        ...validPayload,
        billMonth: "2026-10"
      }).success
    ).toBe(true);
    expect(
      CreateImportInputDtoSchema.safeParse({
        ...validPayload,
        billMonth: "2026-13"
      }).success
    ).toBe(false);
  });

  it("rejects client-selected account ownership", () => {
    expect(
      CreateBankaccountInputDtoSchema.safeParse({
        name: "Checking",
        type: "checking",
        dueDate: null,
        groupId: "1",
        userId: "1fbf901b-b0f9-4ce8-98ec-573725ce9330"
      }).success
    ).toBe(false);
  });
});
