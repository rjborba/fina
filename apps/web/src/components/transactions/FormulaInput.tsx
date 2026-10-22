import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"

export type FormulaOption = {
  key: string
  name: string
  token: string
  kind: "Category" | "Custom tile"
}

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
  const input = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)
  // A suggestion can leave the text unchanged; its caret move still needs committing.
  useLayoutEffect(() => {
    if (pendingCaret.current === null) return
    const position = pendingCaret.current
    pendingCaret.current = null
    input.current?.focus()
    input.current?.setSelectionRange(position, position)
  })
  const [caret, setCaret] = useState(value.length)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive] = useState(0)
  const beforeCaret = value.slice(0, caret)
  const start = beforeCaret.lastIndexOf("{{")
  const search = start >= 0 ? beforeCaret.slice(start + 2) : null
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
  useEffect(() => {
    if (opened)
      document
        .getElementById(`${id}-option-${activeIndex}`)
        ?.scrollIntoView?.({ block: "nearest" })
  }, [opened, id, activeIndex])
  const choose = (option: FormulaOption) => {
    const end = value.indexOf("}}", caret)
    const replaceEnd =
      end >= 0 && !/[{}]/.test(value.slice(caret, end)) ? end + 2 : caret
    const insertion = `{{${option.token}}}`
    const nextCaret = start + insertion.length
    pendingCaret.current = nextCaret
    onChange(value.slice(0, start) + insertion + value.slice(replaceEnd))
    setCaret(nextCaret)
    setDismissed(true)
  }
  return (
    <div>
      <Input
        id={id}
        ref={input}
        value={value}
        disabled={disabled}
        maxLength={16000}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={opened}
        aria-controls={opened ? `${id}-suggestions` : undefined}
        aria-activedescendant={
          opened && matches.length ? `${id}-option-${activeIndex}` : undefined
        }
        aria-describedby={`${id}-help`}
        autoComplete="off"
        spellCheck={false}
        className="font-mono text-xs"
        placeholder="{{Category}} * 0.3"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSelect={(event) => {
          const nextCaret = event.currentTarget.selectionStart ?? value.length
          if (nextCaret !== caret) setDismissed(false)
          setCaret(nextCaret)
        }}
        onChange={(event) => {
          onChange(event.target.value)
          setCaret(event.target.selectionStart ?? event.target.value.length)
          setActive(0)
          setDismissed(false)
        }}
        onKeyDown={(event) => {
          if (!opened) return
          if (event.key === "Escape") {
            event.preventDefault()
            event.stopPropagation()
            setDismissed(true)
          } else if (
            matches.length &&
            (event.key === "ArrowDown" || event.key === "ArrowUp")
          ) {
            event.preventDefault()
            setActive(
              (activeIndex +
                (event.key === "ArrowDown" ? 1 : -1) +
                matches.length) %
                matches.length
            )
          } else if (
            matches.length &&
            (event.key === "Enter" || event.key === "Tab")
          ) {
            event.preventDefault()
            choose(matches[activeIndex])
          }
        }}
      />
      {opened ? (
        <div className="mt-1 rounded-md border border-fina-grid bg-fina-surface p-1 shadow-fina-sm">
          <ul
            id={`${id}-suggestions`}
            role="listbox"
            aria-label="Formula references"
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
                    {option.kind}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!matches.length ? (
            <p role="status" className="px-2 py-2 text-xs text-foreground/60">
              No matching categories or tiles.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
