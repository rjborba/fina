import {
  customFormulaHashReference,
  customFormulaReferenceName,
  tokenizeCustomFormula
} from "./syntax";

export class FormulaError extends Error {}
export function hasInvalidFormulaNameCharacters(value: string): boolean {
  return (
    /[{}]/.test(value) ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  );
}
type Expression =
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "reference"; name: string }
  | { kind: "unary"; operator: string; child: Expression }
  | { kind: "binary"; operator: string; left: Expression; right: Expression };
type Statement =
  | { kind: "return"; expression: Expression }
  | {
      kind: "if";
      condition: Expression;
      then: Statement[];
      otherwise: Statement[];
    };
type Node = Expression | { kind: "program"; statements: Statement[] };
const PRECEDENCE: Readonly<Record<string, number>> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "===": 3,
  "!==": 3,
  ">": 4,
  "<": 4,
  ">=": 4,
  "<=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6
};
function valueType(node: Expression): "number" | "boolean" {
  if (
    node.kind === "boolean" ||
    (node.kind === "unary" && node.operator === "!") ||
    (node.kind === "binary" && PRECEDENCE[node.operator] <= 4)
  )
    return "boolean";
  return "number";
}
function requireNumber(node: Expression) {
  if (valueType(node) !== "number")
    throw new FormulaError("Arithmetic and return values must be numbers.");
}

/** Bounded formula interpreter. No JavaScript, loops, property access or calls. */
export function parseCustomFormula(expression: string): {
  tree: Node;
  references: string[];
} {
  if (!expression.trim() || expression.length > 16000)
    throw new FormulaError("Enter a formula of at most 16,000 characters.");
  const tokens = tokenizeCustomFormula(expression).filter(
    (token) => token.type !== "space"
  );
  if (tokens.length > 256)
    throw new FormulaError("Formula is too complex (maximum 256 tokens).");
  if (tokens.some((token) => token.type === "invalid"))
    throw new FormulaError(
      "Use numbers, references, operators, if / else and return only."
    );
  let position = 0;
  const references = new Set<string>();
  const peek = () => tokens[position]?.text;
  function expect(text: string, message: string) {
    if (peek() !== text) throw new FormulaError(message);
    position++;
  }
  function checkDepth(depth: number) {
    if (depth > 32) throw new FormulaError("Formula nesting is too deep.");
  }
  function atom(depth: number): Expression {
    checkDepth(depth);
    const token = tokens[position++];
    if (!token) throw new FormulaError("Formula is incomplete.");
    const operator = token.text === "−" ? "-" : token.text;
    if (["+", "-", "!"].includes(operator)) {
      const child = atom(depth + 1);
      if (operator !== "!") requireNumber(child);
      return { kind: "unary", operator, child };
    }
    if (token.type === "number") {
      const value = Number(token.text);
      if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
        throw new FormulaError("Number is too large.");
      return { kind: "number", value };
    }
    if (token.type === "reference") {
      const name = customFormulaReferenceName(token.text);
      if (!name || hasInvalidFormulaNameCharacters(name))
        throw new FormulaError("Choose a category or custom tile reference.");
      references.add(name);
      return { kind: "reference", name };
    }
    if (token.text === "true" || token.text === "false")
      return { kind: "boolean", value: token.text === "true" };
    if (token.text === "(") {
      const node = binary(0, depth + 1);
      expect(")", "Close every parenthesis.");
      return node;
    }
    throw new FormulaError("Expected a number, reference or parenthesis.");
  }
  function binary(minimum: number, depth: number): Expression {
    let left = atom(depth);
    while (position < tokens.length) {
      const raw = peek()!;
      const operator =
        raw === "×" ? "*" : raw === "÷" ? "/" : raw === "−" ? "-" : raw;
      const precedence = PRECEDENCE[operator];
      if (!precedence || precedence <= minimum) break;
      position++;
      const right = binary(precedence, depth + 1);
      if (precedence >= 4) {
        requireNumber(left);
        requireNumber(right);
      } else if (precedence === 3 && valueType(left) !== valueType(right))
        throw new FormulaError("Compare values of the same type.");
      left = { kind: "binary", operator, left, right };
    }
    return left;
  }
  function statement(depth: number): Statement {
    checkDepth(depth);
    if (peek() === "return") {
      position++;
      const value = binary(0, depth);
      requireNumber(value);
      if (peek() === ";") position++;
      else if (
        peek() &&
        peek() !== "}" &&
        !/[\r\n]/.test(
          expression.slice(tokens[position - 1].end, tokens[position].start)
        )
      )
        throw new FormulaError(
          "Separate statements with a new line or semicolon."
        );
      return { kind: "return", expression: value };
    }
    expect("if", "Use if conditions and return statements only.");
    expect("(", "Put the if condition inside parentheses.");
    const condition = binary(0, depth + 1);
    expect(")", "Close every parenthesis.");
    const then = block(depth + 1);
    let otherwise: Statement[] = [];
    if (peek() === "else") {
      position++;
      otherwise = peek() === "if" ? [statement(depth + 1)] : block(depth + 1);
    }
    return { kind: "if", condition, then, otherwise };
  }
  function block(depth: number): Statement[] {
    checkDepth(depth);
    expect("{", "Wrap each branch in { braces }.");
    const statements: Statement[] = [];
    while (peek() && peek() !== "}") statements.push(statement(depth));
    expect("}", "Close every block with }.");
    return statements;
  }
  function alwaysReturns(statements: Statement[]): boolean {
    return statements.some(
      (item) =>
        item.kind === "return" ||
        (alwaysReturns(item.then) && alwaysReturns(item.otherwise))
    );
  }
  let tree: Node;
  if (peek() === "if" || peek() === "return") {
    const statements: Statement[] = [];
    while (position < tokens.length) statements.push(statement(0));
    if (!alwaysReturns(statements))
      throw new FormulaError(
        "Return a number on every path (add else or a final return)."
      );
    tree = { kind: "program", statements };
  } else {
    tree = binary(0, 0);
    requireNumber(tree);
  }
  if (position !== tokens.length)
    throw new FormulaError("Expected an arithmetic operator.");
  return { tree, references: [...references] };
}

export function rewriteCustomFormula(
  expression: string,
  resolve: (name: string) => string
): string {
  parseCustomFormula(expression);
  return tokenizeCustomFormula(expression)
    .map((token) => {
      if (token.type !== "reference") return token.text;
      const name = resolve(customFormulaReferenceName(token.text));
      return token.text.startsWith("{{")
        ? `{{${name}}}`
        : customFormulaHashReference(name);
    })
    .join("");
}

export type FormulaResult =
  | { value: number; error?: never }
  | { value?: never; error: string };
export function evaluateCustomFormula(
  expression: string,
  resolve: (reference: string) => number
): FormulaResult {
  try {
    function visit(node: Expression): number | boolean {
      let value: number | boolean;
      if (node.kind === "number" || node.kind === "boolean") value = node.value;
      else if (node.kind === "reference") value = resolve(node.name);
      else if (node.kind === "unary") {
        const child = visit(node.child);
        value =
          node.operator === "!"
            ? !child
            : node.operator === "-"
              ? -Number(child)
              : Number(child);
      } else {
        const left = visit(node.left);
        // Branches and boolean operators are lazy; an unused division never fails.
        if (node.operator === "&&")
          return Boolean(left) && Boolean(visit(node.right));
        if (node.operator === "||")
          return Boolean(left) || Boolean(visit(node.right));
        const right = visit(node.right);
        switch (node.operator) {
          case "+":
            value = Number(left) + Number(right);
            break;
          case "-":
            value = Number(left) - Number(right);
            break;
          case "*":
            value = Number(left) * Number(right);
            break;
          case "/":
            if (right === 0) throw new FormulaError("Cannot divide by zero.");
            value = Number(left) / Number(right);
            break;
          case ">":
            value = left > right;
            break;
          case "<":
            value = left < right;
            break;
          case ">=":
            value = left >= right;
            break;
          case "<=":
            value = left <= right;
            break;
          case "==":
          case "===":
            value = left === right;
            break;
          case "!=":
          case "!==":
            value = left !== right;
            break;
          default:
            throw new FormulaError("Invalid operator.");
        }
      }
      if (
        typeof value === "number" &&
        (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
      )
        throw new FormulaError("Result is too large or unavailable.");
      return value;
    }
    function run(statements: Statement[]): number | undefined {
      for (const item of statements) {
        if (item.kind === "return") return Number(visit(item.expression));
        const result = run(visit(item.condition) ? item.then : item.otherwise);
        if (result !== undefined) return result;
      }
    }
    const tree = parseCustomFormula(expression).tree;
    return {
      value:
        tree.kind === "program" ? run(tree.statements)! : Number(visit(tree))
    };
  } catch (error) {
    return {
      error:
        error instanceof FormulaError
          ? error.message
          : "Referenced value is unavailable."
    };
  }
}

export function evaluateCustomValues(
  tiles: readonly { id: string; resolvedExpression: string }[],
  categories: Readonly<Record<string, number>>
): Record<string, FormulaResult> {
  const results: Record<string, FormulaResult> = {};
  const visiting = new Set<string>();
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  function evaluate(id: string): FormulaResult {
    if (results[id]) return results[id];
    if (visiting.has(id)) return { error: "Circular reference." };
    const tile = byId.get(id);
    if (!tile) return { error: "Referenced tile is unavailable." };
    visiting.add(id);
    const result = evaluateCustomFormula(
      tile.resolvedExpression,
      (reference) => {
        const match = /^(category|tile):([1-9]\d*)$/.exec(reference);
        if (!match) throw new FormulaError("Invalid reference.");
        if (match[1] === "category") return categories[match[2]] ?? 0;
        const dependency = evaluate(match[2]);
        if (dependency.error !== undefined)
          throw new FormulaError(`Referenced tile: ${dependency.error}`);
        return dependency.value;
      }
    );
    visiting.delete(id);
    results[id] = result;
    return result;
  }
  for (const tile of tiles) evaluate(tile.id);
  return results;
}
