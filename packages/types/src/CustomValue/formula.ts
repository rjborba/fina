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
type Node =
  | { kind: "number"; value: number }
  | { kind: "reference"; name: string }
  | { kind: "unary"; sign: number; child: Node }
  | { kind: "binary"; operator: string; left: Node; right: Node };
type Token = { type: string; value: string };

/** A deliberately small arithmetic language. Never executes JavaScript. */
export function parseCustomFormula(expression: string): {
  tree: Node;
  references: string[];
} {
  if (!expression.trim() || expression.length > 16000)
    throw new FormulaError("Enter a formula of at most 16,000 characters.");
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < expression.length) {
    const rest = expression.slice(offset);
    const match = /^(\s+|\{\{[^{}]+\}\}|(?:\d+(?:\.\d*)?|\.\d+)|[+*/()-])/.exec(
      rest
    );
    if (!match)
      throw new FormulaError(
        "Use numbers, {{references}}, +, -, *, / and parentheses only."
      );
    const value = match[0];
    offset += value.length;
    if (!value.trim()) continue;
    tokens.push({
      type: value.startsWith("{{")
        ? "reference"
        : /^[\d.]/.test(value)
          ? "number"
          : value,
      value
    });
    if (tokens.length > 256)
      throw new FormulaError("Formula is too complex (maximum 256 tokens).");
  }
  let position = 0;
  const references = new Set<string>();
  function atom(depth: number): Node {
    if (depth > 32) throw new FormulaError("Formula nesting is too deep.");
    const token = tokens[position++];
    if (!token) throw new FormulaError("Formula is incomplete.");
    if (token.type === "+" || token.type === "-")
      return {
        kind: "unary",
        sign: token.type === "-" ? -1 : 1,
        child: atom(depth + 1)
      };
    if (token.type === "number") {
      const value = Number(token.value);
      if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
        throw new FormulaError("Number is too large.");
      return { kind: "number", value };
    }
    if (token.type === "reference") {
      const name = token.value.slice(2, -2).trim();
      if (!name || hasInvalidFormulaNameCharacters(name))
        throw new FormulaError("Choose a category or custom tile reference.");
      references.add(name);
      return { kind: "reference", name };
    }
    if (token.type === "(") {
      const node = binary(0, depth + 1);
      if (tokens[position++]?.type !== ")")
        throw new FormulaError("Close every parenthesis.");
      return node;
    }
    throw new FormulaError("Expected a number, reference or parenthesis.");
  }
  function binary(minimum: number, depth: number): Node {
    let left = atom(depth);
    while (position < tokens.length) {
      const operator = tokens[position].type;
      const precedence =
        operator === "+" || operator === "-"
          ? 1
          : operator === "*" || operator === "/"
            ? 2
            : 0;
      if (!precedence || precedence <= minimum) break;
      position++;
      left = {
        kind: "binary",
        operator,
        left,
        right: binary(precedence, depth + 1)
      };
    }
    return left;
  }
  const tree = binary(0, 0);
  if (position !== tokens.length)
    throw new FormulaError("Expected an arithmetic operator.");
  return { tree, references: [...references] };
}

export function rewriteCustomFormula(
  expression: string,
  resolve: (name: string) => string
): string {
  parseCustomFormula(expression);
  return expression.replace(
    /\{\{([^{}]+)\}\}/g,
    (_, name: string) => `{{${resolve(name.trim())}}}`
  );
}

export type FormulaResult =
  | { value: number; error?: never }
  | { value?: never; error: string };
export function evaluateCustomFormula(
  expression: string,
  resolve: (reference: string) => number
): FormulaResult {
  try {
    function visit(node: Node): number {
      let value: number;
      if (node.kind === "number") value = node.value;
      else if (node.kind === "reference") value = resolve(node.name);
      else if (node.kind === "unary") value = node.sign * visit(node.child);
      else {
        const left = visit(node.left);
        const right = visit(node.right);
        if (node.operator === "/" && right === 0)
          throw new FormulaError("Cannot divide by zero.");
        value =
          node.operator === "+"
            ? left + right
            : node.operator === "-"
              ? left - right
              : node.operator === "*"
                ? left * right
                : left / right;
      }
      if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
        throw new FormulaError("Result is too large or unavailable.");
      return value;
    }
    return { value: visit(parseCustomFormula(expression).tree) };
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
