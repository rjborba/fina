import { customFormulaReferenceName, tokenizeCustomFormula } from "@fina/types"

export type FormulaMode = "simple" | "code"
export type FormulaOption = {
  key: string
  name: string
  token: string
  kind: "Category" | "Custom tile"
}

export type FormulaPart = {
  text: string
  start: number
  end: number
  reference?: FormulaOption
  atomic?: boolean
  display?: string
  className?: string
}

export function formulaParts(
  value: string,
  options: FormulaOption[],
  mode: FormulaMode = "simple"
): FormulaPart[] {
  const normalize = (name: string) =>
    name.normalize("NFKC").trim().toLowerCase()
  const names = new Map<string, FormulaOption | null>()
  const keys = new Map(options.map((option) => [option.key, option]))
  for (const option of options)
    for (const name of [option.token, option.name]) {
      const key = normalize(name)
      const previous = names.get(key)
      names.set(
        key,
        previous === undefined || previous?.key === option.key ? option : null
      )
    }
  const tokens = tokenizeCustomFormula(value)
  const isOperator = (index: number) => tokens[index]?.type === "operator"
  return tokens.flatMap((token, index): FormulaPart[] => {
    const part: FormulaPart = {
      text: token.text,
      start: token.start,
      end: token.end
    }
    if (token.type === "reference") {
      const name = customFormulaReferenceName(token.text)
      part.reference = keys.get(name) ?? names.get(normalize(name)) ?? undefined
      if (part.reference && mode === "simple") {
        part.atomic = true
        part.display = part.reference.name
        part.className = FORMULA_REFERENCE_CLASS
      }
    }
    if (mode === "code") {
      part.className = FORMULA_SYNTAX_CLASS[token.type]
    } else if (token.type === "operator") {
      if (tokens[index - 1]?.type === "space" && !isOperator(index - 2))
        part.start = tokens[index - 1].start
      if (tokens[index + 1]?.type === "space") part.end = tokens[index + 1].end
      part.text = value.slice(part.start, part.end)
      part.display =
        ({ "*": "×", "/": "÷", "-": "−" } as Record<string, string>)[
          token.text
        ] ?? token.text
      part.atomic = true
      part.className = FORMULA_OPERATOR_CLASS
    } else if (
      token.type === "space" &&
      (isOperator(index - 1) || isOperator(index + 1))
    ) {
      // Spaces around operators become visual token spacing, while clipboard/source stay lossless.
      return []
    }
    return [part]
  })
}

export const FORMULA_OPERATOR_CLASS =
  "mx-0.5 inline-flex min-w-4 select-none items-center justify-center rounded bg-foreground/5 px-0.5 align-baseline font-sans text-xs font-medium leading-5 text-foreground"
export const FORMULA_SYNTAX_CLASS: Record<string, string> = {
  keyword: "text-violet-700 dark:text-violet-300",
  reference: "text-sky-700 dark:text-sky-300",
  number: "text-emerald-700 dark:text-emerald-300",
  operator: "text-foreground",
  punctuation: "text-foreground/70",
  invalid: "text-red-700 underline decoration-wavy dark:text-red-300"
}

export const FORMULA_REFERENCE_CLASS =
  "inline-block max-w-full select-none rounded bg-foreground/5 px-1 align-baseline font-sans text-[11px] font-normal leading-snug whitespace-normal break-words text-foreground"

// Native multiline input can create block nodes instead of literal newlines.
function blockPrefix(node: Node): string {
  return node instanceof HTMLElement &&
    ["DIV", "P"].includes(node.tagName) &&
    !node.hasAttribute("contenteditable") &&
    node.previousSibling
    ? "\n"
    : ""
}

export function readFormula(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE)
    return (node.textContent ?? "").replace(/\u00a0/g, " ")
  if (node instanceof HTMLElement) {
    const token = node.dataset.formulaToken
    if (token !== undefined) return token
    if (node.tagName === "BR")
      return node.parentNode?.childNodes.length === 1 ? "" : "\n"
  }
  return blockPrefix(node) + Array.from(node.childNodes, readFormula).join("")
}

function pointOffset(
  root: HTMLElement,
  node: Node,
  offset: number,
  end = false
) {
  let total = 0
  let found = false
  const visit = (current: Node) => {
    total += blockPrefix(current).length
    if (current === node) {
      total +=
        current instanceof HTMLElement &&
        current.dataset.formulaToken !== undefined
          ? offset > 0
            ? readFormula(current).length
            : 0
          : current.nodeType === Node.TEXT_NODE
            ? offset
            : Array.from(current.childNodes)
                .slice(0, offset)
                .reduce((sum, child) => sum + readFormula(child).length, 0)
      found = true
    } else if (
      current instanceof HTMLElement &&
      current.dataset.formulaToken !== undefined
    ) {
      if (current.contains(node)) {
        if (end) total += readFormula(current).length
        found = true
      } else total += readFormula(current).length
    } else if (current.nodeType === Node.TEXT_NODE)
      total += readFormula(current).length
    else
      for (const child of current.childNodes) {
        visit(child)
        if (found) break
      }
  }
  visit(root)
  return total
}

export type FormulaSelection = { start: number; end: number }
export function formulaSelection(root: HTMLElement): FormulaSelection | null {
  const selection = window.getSelection()
  if (!selection?.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  )
    return null
  return {
    start: pointOffset(root, range.startContainer, range.startOffset),
    end: pointOffset(
      root,
      range.endContainer,
      range.endOffset,
      !range.collapsed
    )
  }
}

export function selectFormula(root: HTMLElement, start: number, end = start) {
  const point = (position: number): [Node, number] => {
    let remaining = position
    const visit = (node: Node): [Node, number] | null => {
      const prefix = blockPrefix(node).length
      if (prefix) {
        if (remaining <= prefix) return [node, 0]
        remaining -= prefix
      }
      if (node.nodeType === Node.TEXT_NODE) {
        if (remaining <= readFormula(node).length) return [node, remaining]
        remaining -= readFormula(node).length
      } else if (
        node instanceof HTMLElement &&
        node.dataset.formulaToken !== undefined
      ) {
        const length = readFormula(node).length
        if (remaining <= length)
          return [
            node.parentNode!,
            Array.from(node.parentNode!.childNodes).indexOf(node) +
              (remaining === 0 ? 0 : 1)
          ]
        remaining -= length
      } else
        for (const child of node.childNodes) {
          const result = visit(child)
          if (result) return result
        }
      return null
    }
    return visit(root) ?? [root, root.childNodes.length]
  }
  const [startNode, startOffset] = point(start)
  const [endNode, endOffset] = point(end)
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

// This subtree belongs to the editor, not React. Never parse HTML from a formula.
export function renderFormula(
  root: HTMLElement,
  value: string,
  options: FormulaOption[],
  mode: FormulaMode = "simple",
  labelForKind: (kind: FormulaOption["kind"]) => string = (kind) => kind
) {
  const fragment = document.createDocumentFragment()
  for (const part of formulaParts(value, options, mode)) {
    if (!part.className) fragment.append(document.createTextNode(part.text))
    else {
      const chip = document.createElement("span")
      if (part.atomic) {
        chip.dataset.formulaToken = part.text
        chip.setAttribute("contenteditable", "false")
        chip.draggable = false
      }
      chip.className = part.className
      chip.textContent = part.display ?? part.text
      if (part.reference) {
        chip.dataset.formulaChip = part.reference.key
        chip.title = `${labelForKind(part.reference.kind)}: ${part.reference.name}`
        chip.setAttribute("aria-label", chip.title)
      }
      fragment.append(chip)
    }
  }
  root.replaceChildren(fragment)
}
