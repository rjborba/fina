import { useTranslation } from "react-i18next"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  formulaParts,
  formulaSelection,
  readFormula,
  renderFormula,
  selectFormula,
  type FormulaOption,
  type FormulaSelection
} from "./formulaEditor"

export type { FormulaOption } from "./formulaEditor"
const MAX_LENGTH = 16000
type Snapshot = { value: string; selection: FormulaSelection }

export function FormulaInput({
  id,
  value,
  onChange,
  options,
  disabled
}: {
  id: string
  value: string
  onChange: (value: string) => void
  options: FormulaOption[]
  disabled?: boolean
}) {
  const { t } = useTranslation()

  const editor = useRef<HTMLDivElement>(null)
  const current = useRef(value)
  const composing = useRef(false)
  const renderedOptions = useRef("")
  const history = useRef<{ entries: Snapshot[]; index: number }>({
    entries: [{ value, selection: { start: value.length, end: value.length } }],
    index: 0
  })
  const [caret, setCaret] = useState(value.length)
  const caretPosition = useRef(value.length)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive] = useState(0)
  const beforeCaret = value.slice(0, caret)
  const start = beforeCaret.lastIndexOf("@")
  const search = start >= 0 ? beforeCaret.slice(start + 1) : null
  const opened =
    focused && !dismissed && search !== null && !/[{}]/.test(search)
  const matches = opened
    ? options
        .filter(
          (option) =>
            option.name.toLowerCase().includes(search!.trim().toLowerCase()) ||
            option.token.includes(search!.trim())
        )
        .slice(0, 30)
    : []
  const activeIndex = Math.min(active, Math.max(0, matches.length - 1))

  useLayoutEffect(() => {
    const root = editor.current
    if (!root || composing.current) return
    const signature = JSON.stringify(options)
    const expected = formulaParts(value, options)
      .filter((part) => part.reference)
      .map((part) => part.text)
    const existing = Array.from(
      root.querySelectorAll<HTMLElement>("[data-formula-token]"),
      (node) => node.dataset.formulaToken
    )
    const selection = formulaSelection(root)
    if (current.current !== value) {
      current.current = value
      history.current = {
        entries: [
          { value, selection: { start: value.length, end: value.length } }
        ],
        index: 0
      }
    }
    if (
      readFormula(root) !== value ||
      renderedOptions.current !== signature ||
      JSON.stringify(expected) !== JSON.stringify(existing)
    ) {
      renderFormula(root, value, options)
      if (selection && document.activeElement === root)
        selectFormula(
          root,
          Math.min(selection.start, value.length),
          Math.min(selection.end, value.length)
        )
    }
    renderedOptions.current = signature
  }, [value, options])

  useEffect(() => {
    const changed = () => {
      const root = editor.current
      if (!root || document.activeElement !== root || composing.current) return
      const selection = formulaSelection(root)
      if (!selection) return
      if (caretPosition.current !== selection.start) {
        caretPosition.current = selection.start
        setCaret(selection.start)
        setDismissed(false)
      }
      history.current.entries[history.current.index].selection = selection
    }
    document.addEventListener("selectionchange", changed)
    return () => document.removeEventListener("selectionchange", changed)
  }, [])
  useEffect(() => {
    if (opened)
      document
        .getElementById(`${id}-option-${activeIndex}`)
        ?.scrollIntoView?.({ block: "nearest" })
  }, [opened, id, activeIndex])

  const commit = (
    next: string,
    selection: FormulaSelection,
    paint = true,
    record = true
  ) => {
    const root = editor.current!
    if (next.length > MAX_LENGTH) {
      renderFormula(root, current.current, options)
      selectFormula(root, Math.min(selection.start, current.current.length))
      return
    }
    if (record && next !== current.current) {
      const state = history.current
      state.entries = state.entries.slice(0, state.index + 1)
      state.entries.push({ value: next, selection })
      if (state.entries.length > 100) state.entries.shift()
      state.index = state.entries.length - 1
    }
    current.current = next
    if (paint) {
      renderFormula(root, next, options)
      root.focus()
      selectFormula(root, selection.start, selection.end)
    }
    onChange(next)
    caretPosition.current = selection.start
    setCaret(selection.start)
    setActive(0)
    setDismissed(false)
  }
  const replace = (from: number, to: number, text: string) => {
    const position = from + text.length
    commit(current.current.slice(0, from) + text + current.current.slice(to), {
      start: position,
      end: position
    })
  }
  const insert = (text: string) => {
    const selection = formulaSelection(editor.current!) ?? {
      start: current.current.length,
      end: current.current.length
    }
    replace(selection.start, selection.end, text.replace(/\r?\n/g, " "))
  }
  const choose = (option: FormulaOption) => {
    const nameEnd = start + 1 + option.name.length
    const replaceEnd =
      value.slice(start + 1, nameEnd).toLowerCase() ===
      option.name.toLowerCase()
        ? Math.max(caret, nameEnd)
        : caret
    replace(start, replaceEnd, `{{${option.token}}}`)
    setDismissed(true)
  }
  const restore = (direction: -1 | 1) => {
    const state = history.current
    const index = state.index + direction
    if (index < 0 || index >= state.entries.length) return
    state.index = index
    const snapshot = state.entries[index]
    commit(snapshot.value, snapshot.selection, true, false)
    setDismissed(true)
  }
  const eraseReference = (backward: boolean) => {
    const selection = formulaSelection(editor.current!)
    if (!selection || selection.start !== selection.end) return false
    const reference = formulaParts(current.current, options).find(
      (part) =>
        part.reference &&
        (backward
          ? part.end === selection.start
          : part.start === selection.start)
    )
    if (!reference) return false
    replace(reference.start, reference.end, "")
    return true
  }
  const typed = () => {
    if (disabled || composing.current) return
    const root = editor.current!
    const next = readFormula(root)
    commit(
      next,
      formulaSelection(root) ?? { start: next.length, end: next.length },
      false
    )
  }
  // React's before-input polyfill does not expose native inputType (mobile undo/delete).
  useLayoutEffect(() => {
    const root = editor.current!
    const beforeInput = (event: InputEvent) => {
      if (disabled || composing.current || event.isComposing) return
      if (
        event.inputType === "historyUndo" ||
        event.inputType === "historyRedo"
      ) {
        event.preventDefault()
        restore(event.inputType === "historyUndo" ? -1 : 1)
      } else if (
        (event.inputType === "deleteContentBackward" ||
          event.inputType === "deleteContentForward") &&
        eraseReference(event.inputType === "deleteContentBackward")
      )
        event.preventDefault()
      else if (
        event.inputType === "insertParagraph" ||
        event.inputType === "insertLineBreak"
      ) {
        event.preventDefault()
        root.closest("form")?.requestSubmit()
      }
    }
    root.addEventListener("beforeinput", beforeInput)
    return () => root.removeEventListener("beforeinput", beforeInput)
  })
  return (
    <div>
      <div
        id={id}
        ref={editor}
        role="combobox"
        contentEditable={!disabled}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-labelledby={`${id}-label`}
        aria-autocomplete="list"
        aria-expanded={opened}
        aria-controls={opened ? `${id}-suggestions` : undefined}
        aria-activedescendant={
          opened && matches.length ? `${id}-option-${activeIndex}` : undefined
        }
        aria-describedby={`${id}-help`}
        aria-multiline="false"
        data-placeholder="Type @ to add a category or custom tile"
        spellCheck={false}
        className="min-h-9 w-full min-w-0 whitespace-pre-wrap break-words rounded-md border border-input bg-transparent px-3 py-1.5 font-mono text-xs leading-6 shadow-xs outline-none [font-feature-settings:normal] [font-variant-ligatures:none] empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-disabled:opacity-50"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={typed}
        onCompositionStart={() => {
          composing.current = true
        }}
        onCompositionEnd={() => {
          composing.current = false
          typed()
        }}
        onMouseDown={(event) => {
          const chip =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-formula-token]")
              : null
          if (!chip || disabled) return
          event.preventDefault()
          const range = document.createRange()
          range.selectNode(chip)
          const selection = window.getSelection()
          selection?.removeAllRanges()
          selection?.addRange(range)
          const offsets = formulaSelection(editor.current!)!
          editor.current!.focus()
          selectFormula(editor.current!, offsets.end)
          caretPosition.current = offsets.end
          setCaret(offsets.end)
          setDismissed(true)
        }}
        onPaste={(event) => {
          event.preventDefault()
          if (!disabled) insert(event.clipboardData.getData("text/plain"))
        }}
        onCopy={(event) => {
          const selection = formulaSelection(editor.current!)
          if (!selection) return
          event.preventDefault()
          event.clipboardData.setData(
            "text/plain",
            current.current.slice(selection.start, selection.end)
          )
        }}
        onCut={(event) => {
          const selection = formulaSelection(editor.current!)
          if (!selection) return
          event.preventDefault()
          event.clipboardData.setData(
            "text/plain",
            current.current.slice(selection.start, selection.end)
          )
          if (!disabled) replace(selection.start, selection.end, "")
        }}
        onDrop={(event) => {
          event.preventDefault()
          if (!disabled) insert(event.dataTransfer.getData("text/plain"))
        }}
        onKeyDown={(event) => {
          if (disabled || event.nativeEvent.isComposing) return
          if (
            (event.metaKey || event.ctrlKey) &&
            !event.altKey &&
            ["z", "y"].includes(event.key.toLowerCase())
          ) {
            event.preventDefault()
            restore(event.shiftKey || event.key.toLowerCase() === "y" ? 1 : -1)
            return
          }
          if (opened && event.key === "Escape") {
            event.preventDefault()
            event.stopPropagation()
            setDismissed(true)
            return
          }
          if (opened && matches.length) {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
              setActive(
                (activeIndex +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  matches.length) %
                  matches.length
              )
              return
            }
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault()
              choose(matches[activeIndex])
              return
            }
          }
          if (event.key === "Enter") {
            event.preventDefault()
            editor.current?.closest("form")?.requestSubmit()
            return
          }
          if (event.key === "Backspace" || event.key === "Delete") {
            if (eraseReference(event.key === "Backspace"))
              event.preventDefault()
          }
          const selection = formulaSelection(editor.current!)
          if (
            !selection ||
            selection.start !== selection.end ||
            event.shiftKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey
          )
            return
          const reference = formulaParts(current.current, options).find(
            (part) =>
              part.reference &&
              (event.key === "ArrowLeft"
                ? part.end === selection.start
                : event.key === "ArrowRight" && part.start === selection.start)
          )
          const position = reference
            ? event.key === "ArrowLeft"
              ? reference.start
              : reference.end
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? current.current.length
                : null
          if (position !== null) {
            event.preventDefault()
            selectFormula(editor.current!, position)
            caretPosition.current = position
            setCaret(position)
            setDismissed(false)
          }
        }}
      />
      {opened ? (
        <div className="mt-1 rounded-md border border-fina-grid bg-fina-surface p-1 shadow-fina-sm">
          <ul
            id={`${id}-suggestions`}
            role="listbox"
            aria-label={t("Formula references")}
            className="fina-scrollbar max-h-40 overflow-y-auto"
          >
            {matches.map((option, index) => (
              <li key={option.key} role="presentation">
                <button
                  type="button"
                  role="option"
                  id={`${id}-option-${index}`}
                  aria-selected={index === activeIndex}
                  tabIndex={-1}
                  className={`flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-xs ${index === activeIndex ? "bg-fina-violet/15" : "hover:bg-fina-canvas"}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  <span className="min-w-0 break-words">{option.name}</span>
                  <span className="shrink-0 text-[10px] text-foreground/50">
                    {t(option.kind)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!matches.length ? (
            <p role="status" className="px-2 py-2 text-xs text-foreground/60">
              {t("No matching categories or tiles.")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
