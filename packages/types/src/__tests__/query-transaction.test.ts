import { describe, expect, it } from "vitest";
import { QueryTransactionInputDtoSchema } from "../Transactions/QueryTransaction.input.dto";

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
