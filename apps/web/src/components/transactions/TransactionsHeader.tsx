import { FC, type ReactNode, useEffect, useState } from "react"

import { Plus } from "lucide-react"

import { Button } from "../ui/button"
import { CreateTransactionModal } from "../CreateTransactionModal"

interface TransactionsHeaderProps {
  totalCount: number
  children?: ReactNode
}

export const TransactionsHeader: FC<TransactionsHeaderProps> = ({
  totalCount,
  children
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="textbox"]'
        )
      ) {
        return
      }

      if (
        document.querySelector(
          '[role="dialog"]:not([aria-hidden="true"]), [role="alertdialog"]:not([aria-hidden="true"]), [role="menu"], [role="listbox"]'
        )
      )
        return
      if (
        ["c", "n"].includes(event.key.toLowerCase()) &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault()
        setIsCreateOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <header className="shrink-0 bg-fina-surface dark:bg-fina-canvas">
      <div className="flex h-14 items-center justify-between gap-2 border-b border-fina-grid px-3 pl-14 md:h-12 md:gap-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-medium tracking-normal text-foreground">
            Transactions
          </h1>
          <span
            className="text-xs tabular-nums text-muted-foreground"
            aria-label={`${totalCount.toLocaleString("en-US")} entries`}
          >
            {totalCount.toLocaleString("en-US")}
          </span>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          variant="ghost"
          className="h-11 shrink-0 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-foreground md:h-7"
          title="New entry (C)"
          aria-keyshortcuts="C"
        >
          <Plus className="size-3.5" />
          New entry
          <kbd className="ml-1 hidden rounded border border-fina-grid px-1 text-[10px] text-muted-foreground md:inline">
            C
          </kbd>
        </Button>
      </div>
      {children}
      <CreateTransactionModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </header>
  )
}
