export type FormulaToken = {
  type:
    | "space"
    | "reference"
    | "number"
    | "keyword"
    | "operator"
    | "punctuation"
    | "invalid";
  text: string;
  start: number;
  end: number;
};

// Shared by validation and highlighting, including incomplete editor input.
export function tokenizeCustomFormula(source: string): FormulaToken[] {
  const pattern =
    /\s+|\{\{[^{}]+\}\}|#\{[^{}]+\}|#(?:category|tile):[1-9]\d*|#[\p{L}_][\p{L}\p{N}_]*|(?:\d+(?:\.\d*)?|\.\d+)|\b(?:if|else|return|true|false)\b|===|!==|>=|<=|==|!=|&&|\|\||[+*/<>!−×÷-]|[(){};]|[^\s]/gu;
  return Array.from(source.matchAll(pattern), (match) => {
    const text = match[0];
    return {
      text,
      start: match.index!,
      end: match.index! + text.length,
      type: /^\s+$/.test(text)
        ? "space"
        : text.startsWith("{{") || (text.startsWith("#") && text.length > 1)
          ? "reference"
          : /^[\d.]/.test(text)
            ? "number"
            : /^(if|else|return|true|false)$/.test(text)
              ? "keyword"
              : /^[(){};]$/.test(text)
                ? "punctuation"
                : /^[+*/<>!=&|−×÷-]+$/.test(text)
                  ? "operator"
                  : "invalid"
    };
  });
}

export function customFormulaReferenceName(text: string): string {
  return (
    text.startsWith("{{")
      ? text.slice(2, -2)
      : text.startsWith("#{")
        ? text.slice(2, -1)
        : text.slice(1)
  ).trim();
}

export function customFormulaHashReference(name: string): string {
  return /^(?:[\p{L}_][\p{L}\p{N}_]*|(?:category|tile):[1-9]\d*)$/u.test(name)
    ? `#${name}`
    : `#{${name}}`;
}

export function isCustomFormulaCode(expression: string): boolean {
  return tokenizeCustomFormula(expression).some(
    (token) => token.type === "keyword" && ["if", "return"].includes(token.text)
  );
}
