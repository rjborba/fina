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
}

export function formulaParts(
  value: string,
  options: FormulaOption[]
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
  const parts: FormulaPart[] = []
  let offset = 0
  for (const match of value.matchAll(/\{\{([^{}]+)\}\}/g)) {
    const start = match.index!
    const reference = keys.get(match[1]) ?? names.get(normalize(match[1]))
    if (!reference) continue
    if (start > offset)
      parts.push({
        text: value.slice(offset, start),
        start: offset,
        end: start
      })
    const end = start + match[0].length
    parts.push({ text: match[0], start, end, reference })
    offset = end
  }
  if (offset < value.length)
    parts.push({ text: value.slice(offset), start: offset, end: value.length })
  return parts
}

export const FORMULA_REFERENCE_CLASS =
  "inline-block max-w-full select-none rounded bg-foreground/5 px-1 align-baseline font-sans text-[11px] font-normal leading-snug whitespace-normal break-words text-foreground"

export function readFormula(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE)
    return (node.textContent ?? "").replace(/\u00a0/g, " ")
  if (node instanceof HTMLElement) {
    const token = node.dataset.formulaToken
    if (token !== undefined) return token
    if (node.tagName === "BR")
      return node.parentNode?.childNodes.length === 1 ? "" : "\n"
  }
  return Array.from(node.childNodes, readFormula).join("")
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
  options: FormulaOption[]
) {
  const fragment = document.createDocumentFragment()
  for (const part of formulaParts(value, options)) {
    if (!part.reference) fragment.append(document.createTextNode(part.text))
    else {
      const chip = document.createElement("span")
      chip.dataset.formulaToken = part.text
      chip.dataset.formulaChip = part.reference.key
      chip.setAttribute("contenteditable", "false")
      chip.draggable = false
      chip.className = FORMULA_REFERENCE_CLASS
      chip.textContent = part.reference.name
      chip.title = `${part.reference.kind}: ${part.reference.name}`
      chip.setAttribute("aria-label", chip.title)
      fragment.append(chip)
    }
  }
  root.replaceChildren(fragment)
}
