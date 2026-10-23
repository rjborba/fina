import { describe, expect, it } from "vitest";
import {
  evaluateCustomFormula,
  evaluateCustomValues,
  parseCustomFormula,
  rewriteCustomFormula,
  tokenizeCustomFormula,
  SaveCustomValueSchema
} from "../CustomValue";

describe("custom value formulas", () => {
  it.each([
    [12, 1],
    [0, 0],
    [-12, -1]
  ])(
    "evaluates if / else if / else with a signed value of %s",
    (value, result) => {
      const expression =
        "if (#value > 0) {\n  return 1\n} else if (#value < 0) {\n  return -1\n} else {\n  return 0\n}";
      expect(evaluateCustomFormula(expression, () => value)).toEqual({
        value: result
      });
    }
  );
  it("handles nested conditions, early returns, precedence and short-circuit conditions", () => {
    expect(
      evaluateCustomFormula(
        "if (#value >= 10 && !(#value == 20)) { if (true) { return #value * 2; } } return 3;",
        () => 12
      )
    ).toEqual({ value: 24 });
    expect(
      evaluateCustomFormula(
        "if (false && 1 / 0 > 0 || true) { return 0; } else { return 1 / 0; }",
        () => 0
      )
    ).toEqual({ value: 0 });
    expect(
      evaluateCustomFormula(
        "if (true || #Missing > 0) { return 2; } return 1;",
        () => {
          throw Error();
        }
      )
    ).toEqual({ value: 2 });
    for (const operator of [">", "<", ">=", "<=", "==", "!=", "===", "!=="]) {
      expect(
        evaluateCustomFormula(
          `if (2 ${operator} 2) { return 1; } else { return 0; }`,
          () => 0
        )
      ).toEqual({
        value: [">=", "<=", "==", "==="].includes(operator) ? 1 : 0
      });
    }
    expect(evaluateCustomFormula("return 10 − 2 × 3 + 8 ÷ 2", () => 0)).toEqual(
      { value: 8 }
    );
  });
  it("collects references in every branch and rewrites hash and legacy syntax losslessly", () => {
    const expression =
      "if (#value > 0) {\n return #{Shared costs} + {{Old}};\n} else { return #tile:4; }";
    expect(parseCustomFormula(expression).references).toEqual([
      "value",
      "Shared costs",
      "Old",
      "tile:4"
    ]);
    const keys = {
      value: "category:1",
      "Shared costs": "category:2",
      Old: "tile:3",
      "tile:4": "tile:4"
    };
    const resolved = rewriteCustomFormula(
      expression,
      (name) => keys[name as keyof typeof keys]
    );
    expect(resolved).toBe(
      "if (#category:1 > 0) {\n return #category:2 + {{tile:3}};\n} else { return #tile:4; }"
    );
    expect(rewriteCustomFormula(resolved, () => "Renamed category")).toContain(
      "#{Renamed category}"
    );
    expect(
      tokenizeCustomFormula(expression)
        .map((token) => token.text)
        .join("")
    ).toBe(expression);
  });
  it("rejects incomplete paths, nonnumeric returns, malformed blocks and arbitrary code", () => {
    for (const expression of [
      "if (#value > 0) { return 1 }",
      "if (1) {} else {}",
      "return true",
      "return 1 > 0",
      "return !1 + 2",
      "if (#value > 0) return 1; else return 0;",
      "if (true) { return 1;",
      "return 1 return 2",
      "return 1;;",
      "if (true) { return 1; } else if (false) { return 2; }",
      "return Math.max(1, 2)",
      "while (true) { return 1; }",
      "const a = 1; return a",
      "return #value.constructor",
      "return fetch(1)",
      "return 1 = 2"
    ])
      expect(() => parseCustomFormula(expression), expression).toThrow();
    expect(() =>
      parseCustomFormula(
        "if (1) {".repeat(34) + "return 1" + "} else { return 0 }".repeat(34)
      )
    ).toThrow();
    expect(
      evaluateCustomFormula(
        "if (true) { return 1 / 0 } else { return 1 }",
        () => 0
      ).error
    ).toBe("Cannot divide by zero.");
    expect(
      evaluateCustomFormula(
        "if (#value) { return 1 } else { return 0 }",
        () => Infinity
      ).error
    ).toBeTruthy();
  });
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
        color: "teal"
      }).success
    ).toBe(true);
    expect(
      SaveCustomValueSchema.safeParse({
        title: "Example",
        expression: "1",
        color: "#bad"
      }).success
    ).toBe(false);
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
  it("accepts only one- or two-column tile widths without coercion", () => {
    const input = { title: "Width fixture", expression: "2 * 3" };
    for (const columnSpan of [undefined, 1, 2])
      expect(
        SaveCustomValueSchema.safeParse({ ...input, columnSpan }).success
      ).toBe(true);
    for (const columnSpan of [0, 3, -1, 1.5, "2", null])
      expect(
        SaveCustomValueSchema.safeParse({ ...input, columnSpan }).success
      ).toBe(false);
  });
  it("accepts an explicit unset color, without accepting empty or arbitrary colors", () => {
    const input = { title: "Color fixture", expression: "2 * 3" };
    for (const color of [undefined, null, "teal"])
      expect(SaveCustomValueSchema.safeParse({ ...input, color }).success).toBe(
        true
      );
    for (const color of ["", "none", "#ffffff", 0])
      expect(SaveCustomValueSchema.safeParse({ ...input, color }).success).toBe(
        false
      );
  });
});
