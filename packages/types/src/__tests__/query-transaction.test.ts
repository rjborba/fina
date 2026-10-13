import { describe, expect, it } from "vitest";
import { QueryTransactionInputDtoSchema } from "../Transactions/QueryTransaction.input.dto";
import { CreditCardBillListQuerySchema } from "../CreditCardBill";

describe("QueryTransactionInputDtoSchema", () => {
  it("normalizes a single query value into a list", () => {
    const result = QueryTransactionInputDtoSchema.parse({
      groupId: "1",
      categoryIdList: "2"
    });

    expect(result.categoryIdList).toEqual(["2"]);
  });

  it("rejects a request without a group", () => {
    expect(() => QueryTransactionInputDtoSchema.parse({})).toThrow();
  });

  it("accepts only supported account type filters", () => {
    expect(
      QueryTransactionInputDtoSchema.parse({
        groupId: "1",
        accountType: "checkout"
      }).accountType
    ).toBe("checkout");
    expect(
      QueryTransactionInputDtoSchema.safeParse({
        groupId: "1",
        accountType: "checking"
      }).success
    ).toBe(false);
  });
});

describe.each([
  ["transactions", QueryTransactionInputDtoSchema],
  ["credit card bills", CreditCardBillListQuerySchema]
] as const)("%s purchase filter contracts", (_name, schema) => {
  it("normalizes account and import lists and signed value bounds", () => {
    expect(
      schema.parse({
        groupId: "1",
        accountIdList: "2",
        categoryIdList: ["3", "-1"],
        importSource: "imported",
        importIdList: ["4", "5"],
        minValue: " -42.50 ",
        maxValue: "0"
      })
    ).toMatchObject({
      accountIdList: ["2"],
      categoryIdList: ["3", "-1"],
      importSource: "imported",
      importIdList: ["4", "5"],
      minValue: -42.5,
      maxValue: 0
    });
    expect(
      schema.parse({ groupId: "1", importIdList: "4" }).importIdList
    ).toEqual(["4"]);
  });

  it("supports exact values and one-sided inclusive bounds", () => {
    for (const bounds of [
      { minValue: -25, maxValue: -25 },
      { minValue: 0 },
      { maxValue: -1 }
    ]) {
      expect(schema.safeParse({ groupId: "1", ...bounds }).success).toBe(true);
    }
    const invalidRange = schema.safeParse({
      groupId: "1",
      minValue: 1,
      maxValue: -1
    });
    expect(invalidRange.success).toBe(false);
    if (!invalidRange.success)
      expect(invalidRange.error.issues[0]?.path).toEqual(["maxValue"]);
  });

  it("rejects blank, nonnumeric and nonfinite values", () => {
    for (const value of [
      "",
      " ",
      "NaN",
      "Infinity",
      "-Infinity",
      NaN,
      Infinity,
      null,
      true
    ]) {
      for (const key of ["minValue", "maxValue"]) {
        expect(schema.safeParse({ groupId: "1", [key]: value }).success).toBe(
          false
        );
      }
    }
  });

  it("rejects unsupported sources and malformed related identifiers", () => {
    for (const filters of [
      { importSource: "csv" },
      { importIdList: "other" },
      { importIdList: "-1" },
      { accountIdList: "-1" },
      { categoryIdList: "-2" }
    ]) {
      expect(schema.safeParse({ groupId: "1", ...filters }).success).toBe(
        false
      );
    }
    expect(
      schema.parse({ groupId: "1", importSource: "manual" }).importSource
    ).toBe("manual");
  });
});
