import { describe, expect, it } from "vitest";
import { QueryTransactionInputDtoSchema } from "../Transactions/QueryTransaction.input.dto";

describe("QueryTransactionInputDtoSchema", () => {
  it("normalizes a single query value into a list", () => {
    const result = QueryTransactionInputDtoSchema.parse({
      groupId: "group-1",
      categoryIdList: "category-1"
    });

    expect(result.categoryIdList).toEqual(["category-1"]);
  });

  it("rejects a request without a group", () => {
    expect(() => QueryTransactionInputDtoSchema.parse({})).toThrow();
  });
});
