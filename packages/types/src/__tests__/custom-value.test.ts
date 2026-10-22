import { describe, expect, it } from "vitest";
import {
  evaluateCustomFormula,
  evaluateCustomValues,
  parseCustomFormula,
  SaveCustomValueSchema
} from "../CustomValue";

describe("custom value formulas", () => {
  it("evaluates precedence, parentheses, decimals and unary signs without executing code", () => {
    expect(
      evaluateCustomFormula("-(2 + .5) * -4 / 2 + {{Shared}} * 0.3", () => -100)
    ).toEqual({ value: -25 });
    expect(evaluateCustomFormula("8 / 2 / 2 - 1 - 1", () => 0)).toEqual({
      value: 0
    });
    for (const expression of [
      "Math.random()",
      "1; alert(1)",
      "{{}}",
      "1 +",
      "(1+2",
      "1 2",
      "2 ** 2",
      ""
    ])
      expect(() => parseCustomFormula(expression)).toThrow();
  });
  it("fails safely on zero, overflow, unavailable inputs, nesting and excessive complexity", () => {
    expect(evaluateCustomFormula("1 / (2 - 2)", () => 0)).toEqual({
      error: "Cannot divide by zero."
    });
    expect(
      evaluateCustomFormula("9007199254740991 * 2", () => 0).error
    ).toBeTruthy();
    expect(evaluateCustomFormula("{{A}}", () => NaN).error).toBeTruthy();
    expect(() =>
      parseCustomFormula("(".repeat(40) + "1" + ")".repeat(40))
    ).toThrow();
    expect(() => parseCustomFormula(Array(200).fill("1").join("+"))).toThrow();
  });
  it("resolves chained tiles, carries errors downstream and catches cycles", () => {
    const tiles = [
      { id: "1", resolvedExpression: "{{category:8}} * .3" },
      { id: "2", resolvedExpression: "{{tile:1}} + {{category:9}}" }
    ];
    expect(evaluateCustomValues(tiles, { 8: -100, 9: 40 })).toEqual({
      1: { value: -30 },
      2: { value: 10 }
    });
    expect(
      evaluateCustomValues(
        [{ id: "1", resolvedExpression: "1/0" }, tiles[1]],
        {}
      )[2].error
    ).toContain("divide by zero");
    expect(
      evaluateCustomValues(
        [
          { id: "1", resolvedExpression: "{{tile:2}}" },
          { id: "2", resolvedExpression: "{{tile:1}}" }
        ],
        {}
      )[1].error
    ).toContain("Circular");
  });
  it("rejects identifier bypasses and unsafe titles", () => {
    expect(
      SaveCustomValueSchema.safeParse({
        title: "Example",
        expression: "1",
        groupId: "2"
      }).success
    ).toBe(false);
    expect(
      SaveCustomValueSchema.safeParse({ title: "{{Bad}}", expression: "1" })
        .success
    ).toBe(false);
  });
});
