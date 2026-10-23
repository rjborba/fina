import { useEffect, useRef, useState } from "react"
import { useAtom } from "jotai"
import { Search, X } from "lucide-react"
import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import { Button } from "@/components/ui/button"

export function TransactionsSearch({
  open,
  onOpenChange,
  focusRequest = 0
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  focusRequest?: number
}) {
  const [filter, setFilter] = useAtom(transactionFilterAtom)
  const [draft, setDraft] = useState(filter.partialDescription)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(
    () => setDraft(filter.partialDescription),
    [filter.partialDescription]
  )
  useEffect(() => {
    if (draft === filter.partialDescription) return
    const timer = window.setTimeout(() => {
      setFilter((current) => ({ ...current, partialDescription: draft }))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [draft, filter.partialDescription, setFilter])
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open, focusRequest])

  if (!open && !filter.partialDescription) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-11 text-muted-foreground md:size-7"
        aria-label="Find in view"
        title="Find in view (⌘/Ctrl F)"
        onClick={() => onOpenChange(true)}
      >
        <Search className="size-3.5" />
      </Button>
    )
  }

  return (
    <div className="flex h-11 w-full min-w-0 items-center gap-1.5 rounded-md border border-fina-grid px-2 focus-within:border-fina-violet/50 md:h-7 md:w-44">
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        aria-label="Find in view"
        placeholder="Find in view…"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== filter.partialDescription)
            setFilter((current) => ({ ...current, partialDescription: draft }))
        }}
        className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-xs"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation()
            setDraft("")
            setFilter((current) => ({ ...current, partialDescription: "" }))
            onOpenChange(false)
          }
        }}
      />
      <button
        type="button"
        aria-label="Clear search"
        className="flex size-9 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground md:size-auto"
        onClick={() => {
          setDraft("")
          setFilter((current) => ({ ...current, partialDescription: "" }))
          onOpenChange(false)
        }}
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
