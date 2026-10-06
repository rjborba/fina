import { ArrowDownUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  getTransactionSortLabel,
  TRANSACTION_SORT_OPTIONS,
  type TransactionSortOption
} from "./transactionSort"

interface TransactionsSortProps {
  value: TransactionSortOption
  onValueChange: (value: TransactionSortOption) => void
  options?: typeof TRANSACTION_SORT_OPTIONS
}

export function TransactionsSort({
  value,
  onValueChange,
  options = TRANSACTION_SORT_OPTIONS
}: TransactionsSortProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="fina-secondary"
          lift
          className="h-11 min-w-40 justify-between px-3 font-mono text-[10px] tracking-[0.1em]"
          aria-label={`Sort transactions by ${getTransactionSortLabel(value)}`}
        >
          <span>Sort / {getTransactionSortLabel(value)}</span>
          <ArrowDownUp className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-none border-2 border-fina-ink bg-fina-surface p-0 text-fina-ink shadow-fina-md"
      >
        <DropdownMenuLabel className="bg-fina-lime px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em]">
          Sort transactions
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0 bg-fina-ink" />
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) =>
            onValueChange(nextValue as TransactionSortOption)
          }
          className="p-1"
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="rounded-none font-mono text-[11px] font-bold text-fina-ink focus:bg-fina-yellow focus:text-fina-ink"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
