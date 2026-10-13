import { type RefObject, useEffect, useState } from "react"

interface TransactionListKeyboardOptions {
  containerRef: RefObject<HTMLDivElement>
  rowKeys: readonly string[]
  enabled: boolean
  onOpen: (key: string) => void
  onToggleSelection: (key: string) => void
  onExtendSelection: (anchorKey: string, targetKey: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  scrollToIndex: (index: number) => void
}

const interactiveSelector =
  "input, textarea, select, button:not([data-list-open]), a:not([data-list-open]), [contenteditable]:not([contenteditable='false']), [role='combobox'], [role='textbox'], [role='switch'], [role='checkbox'], [data-transaction-metadata]"
const editableSelector =
  "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='combobox'], [role='textbox']"
const overlaySelector =
  "[role='dialog']:not([aria-hidden='true']), [role='alertdialog']:not([aria-hidden='true']), [role='menu']:not([aria-hidden='true']), [role='listbox']:not([aria-hidden='true']), [data-transaction-shortcuts-blocked='true']"

function focusListRow(container: HTMLDivElement, key: string) {
  Array.from(container.querySelectorAll<HTMLDivElement>("[data-list-key]"))
    .find((row) => row.dataset.listKey === key)
    ?.querySelector<HTMLDivElement>("[data-list-focus-target]")
    ?.focus({ preventScroll: true })
}

/** List shortcuts yield to editors, overlays, and the rest of the page's controls. */
export function useTransactionListKeyboard({
  containerRef,
  rowKeys,
  enabled,
  onOpen,
  onToggleSelection,
  onExtendSelection,
  onSelectAll,
  onClearSelection,
  scrollToIndex
}: TransactionListKeyboardOptions) {
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null)
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null)
  const activeRowKey =
    focusedRowKey && rowKeys.includes(focusedRowKey) ? focusedRowKey : null
  const activeHoveredRowKey =
    hoveredRowKey && rowKeys.includes(hoveredRowKey) ? hoveredRowKey : null

  useEffect(() => {
    if (!activeRowKey) return
    const activeElement = document.activeElement
    if (
      document.querySelector(overlaySelector) ||
      (activeElement instanceof Element &&
        activeElement.closest(interactiveSelector)) ||
      (activeElement &&
        activeElement !== document.body &&
        !containerRef.current?.contains(activeElement))
    )
      return
    if (containerRef.current) focusListRow(containerRef.current, activeRowKey)
  })

  useEffect(() => {
    if (!enabled || rowKeys.length === 0) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey) return
      const container = containerRef.current
      if (!container) return
      const target = event.target instanceof Element ? event.target : null
      const activeElement = document.activeElement
      const key = event.key.toLowerCase()
      const isJumpKey =
        (key === "j" || key === "k") && !event.metaKey && !event.ctrlKey
      const isHoveredSelectionKey =
        key === "x" &&
        Boolean(activeHoveredRowKey) &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey
      const selectionRowKey = activeHoveredRowKey ?? activeRowKey
      const isGlobalListKey = isJumpKey || isHoveredSelectionKey
      if (
        target?.closest(editableSelector) ||
        (target?.closest(interactiveSelector) &&
          (!isGlobalListKey || container.contains(target))) ||
        (activeElement instanceof Element &&
          (activeElement.closest(editableSelector) ||
            (activeElement.closest(interactiveSelector) &&
              (!isGlobalListKey || container.contains(activeElement))))) ||
        document.querySelector(overlaySelector) ||
        (!isGlobalListKey &&
          activeElement &&
          activeElement !== document.body &&
          activeElement !== document.documentElement &&
          !container.contains(activeElement))
      ) {
        return
      }

      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === "a" && !event.shiftKey) {
          event.preventDefault()
          onSelectAll()
        }
        return
      }

      const direction =
        key === "arrowdown" || key === "j"
          ? 1
          : key === "arrowup" || key === "k"
            ? -1
            : 0
      if (direction !== 0) {
        event.preventDefault()
        if (isJumpKey && !container.contains(activeElement)) {
          container.focus({ preventScroll: true })
        }
        setHoveredRowKey(null)
        const currentIndex = activeRowKey ? rowKeys.indexOf(activeRowKey) : -1
        const nextIndex =
          currentIndex === -1
            ? direction === 1
              ? 0
              : rowKeys.length - 1
            : Math.max(
                0,
                Math.min(rowKeys.length - 1, currentIndex + direction)
              )
        const nextKey = rowKeys[nextIndex]
        if (event.shiftKey) {
          onExtendSelection(activeRowKey ?? nextKey, nextKey)
        }
        scrollToIndex(nextIndex)
        setFocusedRowKey(nextKey)
        if (nextKey === activeRowKey) focusListRow(container, nextKey)
        return
      }

      if (key === "escape") {
        event.preventDefault()
        onClearSelection()
        setFocusedRowKey(null)
        setHoveredRowKey(null)
      } else if (key === "x" && !event.shiftKey && selectionRowKey) {
        event.preventDefault()
        onToggleSelection(selectionRowKey)
      } else if (activeRowKey && !event.shiftKey) {
        if (key === "enter" || key === " ") {
          event.preventDefault()
          onOpen(activeRowKey)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    activeRowKey,
    activeHoveredRowKey,
    containerRef,
    enabled,
    onClearSelection,
    onExtendSelection,
    onOpen,
    onSelectAll,
    onToggleSelection,
    rowKeys,
    scrollToIndex
  ])

  return { focusedRowKey: activeRowKey, setFocusedRowKey, setHoveredRowKey }
}
