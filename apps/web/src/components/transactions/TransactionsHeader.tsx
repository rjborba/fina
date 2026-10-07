import { FC, useEffect, useState } from "react"

import { ArrowUpRight, Filter, Plus } from "lucide-react"

import { TransactionsDateFilter } from "@/components/transactions/TransactionsDateFilter"
import { FinaBadge } from "@/components/ui/fina"
import { Button } from "../ui/button"
import { CreateTransactionModal } from "../CreateTransactionModal"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"

interface TransactionsHeaderProps {
  isFilterOpen: boolean
  onFilterToggle: (value: boolean) => void
  totalCount: number
  monthlyReview?: boolean
}

export const TransactionsHeader: FC<TransactionsHeaderProps> = ({
  isFilterOpen,
  onFilterToggle,
  totalCount,
  monthlyReview = false
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { selectedGroup } = useActiveGroup()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, [role="combobox"]')
      ) {
        return
      }

      if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        setIsCreateOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <header className="transactions-hero border-b-[3px] border-fina-ink px-4 pb-4 pt-16 md:px-8 md:py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] font-black uppercase tracking-[0.16em]">
            <FinaBadge>Ledger / 01</FinaBadge>
            <span className="truncate">
              {selectedGroup?.name || "Your group"}
            </span>
            <span aria-hidden="true">/</span>
            <span>{totalCount.toLocaleString("en-US")} entries</span>
          </div>
          <h1 className="max-w-full text-[clamp(1.8rem,5vw,4.75rem)] font-black uppercase leading-[0.82] tracking-[-0.075em] text-fina-ink">
            Transactions<span className="text-fina-violet">.</span>
          </h1>
        </div>

        <div className="flex max-w-full flex-wrap items-stretch gap-3">
          <TransactionsDateFilter monthlyReview={monthlyReview} />
          <Button
            variant="fina-secondary"
            lift
            onClick={() => onFilterToggle(!isFilterOpen)}
            className="h-12 px-4"
          >
            <Filter className="size-4" />
            Filter
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            variant="fina-primary"
            lift
            className="h-12 px-5"
          >
            <Plus className="size-4" />
            New entry
            <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </div>
      <CreateTransactionModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </header>
  )
}
