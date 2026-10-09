import { TransactionDetailsModal } from "@/components/transactions/TransactionDetailsModal"
import { FinaBadge } from "@/components/ui/fina"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCategories } from "@/data/categories/useCategories"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { CreditCardBillSummary, TransactionOutput } from "@fina/types"
import { useVirtualizer } from "@tanstack/react-virtual"
import dayjs from "dayjs"
import { ArrowUpRight, CreditCard } from "lucide-react"
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { useNavigate } from "react-router"
import { buildGroupedLedgerRows } from "./groupedLedgerRows"
import {
  selectTransactionRange,
  toggleTransactionSelection
} from "./transactionSelection"
import { TransactionBulkActions } from "./TransactionBulkActions"
import {
  TransactionLedgerTransaction,
  type UpdateLedgerTransaction
} from "./TransactionLedgerTransaction"
import type { TransactionSortOption } from "./transactionSort"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
})

const statusDetails = {
  empty: { label: "Empty", tone: "sky" as const },
  "needs-reconciliation": {
    label: "Needs reconciliation",
    tone: "yellow" as const
  },
  reconciled: { label: "Reconciled", tone: "lime" as const },
  "needs-review": { label: "Needs review", tone: "danger" as const }
}

const ROW_HEIGHT = 88

interface CreditCardBillsLedgerProps {
  transactions: readonly TransactionOutput[]
  bills: readonly CreditCardBillSummary[]
  sort: TransactionSortOption
  dateBasis?: "cash-flow" | "monthly-review"
  isLoading: boolean
  isError: boolean
  onUpdateTransaction: UpdateLedgerTransaction
  onDeleteTransactions: (ids: string[]) => Promise<void>
}

export function CreditCardBillsLedger({
  transactions,
  bills,
  sort,
  dateBasis = "cash-flow",
  isLoading,
  isError,
  onUpdateTransaction,
  onDeleteTransactions
}: CreditCardBillsLedgerProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { selectedGroup } = useActiveGroup()
  const { data: categoriesData } = useCategories({
    groupId: selectedGroup?.id?.toString()
  })
  const categories = useMemo(
    () =>
      categoriesData?.map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color
      })) || [],
    [categoriesData]
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const rows = useMemo(
    () => buildGroupedLedgerRows(transactions, bills, sort, dateBasis),
    [bills, sort, transactions, dateBasis]
  )
  const visibleTransactions = useMemo(
    () =>
      rows.flatMap((row) =>
        row.kind === "transaction" ? [row.transaction] : []
      ),
    [rows]
  )
  const transactionIds = useMemo(
    () => visibleTransactions.map((transaction) => transaction.id),
    [visibleTransactions]
  )
  const transactionIdSet = useMemo(
    () => new Set(transactionIds),
    [transactionIds]
  )
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    Set<string>
  >(() => new Set())
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(
    null
  )
  const [isDeletingSelected, setIsDeletingSelected] = useState(false)
  const selectedTransactionIndex = visibleTransactions.findIndex(
    (transaction) => transaction.id === selectedTransactionId
  )
  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => rows[index]?.key || index,
    getScrollElement: () => containerRef.current,
    overscan: 15
  })

  useEffect(() => {
    setSelectedTransactionIds(
      (currentSelection) =>
        new Set(
          [...currentSelection].filter((transactionId) =>
            transactionIdSet.has(transactionId)
          )
        )
    )
    setSelectionAnchorId((currentAnchor) =>
      currentAnchor && transactionIdSet.has(currentAnchor)
        ? currentAnchor
        : null
    )
  }, [transactionIdSet])

  const clearSelection = useCallback(() => {
    setSelectedTransactionIds(new Set())
    setSelectionAnchorId(null)
  }, [])

  useEffect(() => {
    if (selectedTransactionIds.size === 0) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearSelection()
    }

    window.addEventListener("keydown", handleEscape, { capture: true })
    return () =>
      window.removeEventListener("keydown", handleEscape, { capture: true })
  }, [clearSelection, selectedTransactionIds.size])

  const selectAllTransactions = useCallback(() => {
    setSelectedTransactionIds(new Set(transactionIds))
  }, [transactionIds])

  const deleteSelectedTransactions = useCallback(async () => {
    const ids = [...selectedTransactionIds]
    if (ids.length === 0) return

    setIsDeletingSelected(true)
    try {
      await onDeleteTransactions(ids)
      clearSelection()
      toast({
        title: `${ids.length} transaction${ids.length === 1 ? "" : "s"} deleted`
      })
    } catch {
      toast({
        title: "Could not delete the selected transactions",
        variant: "destructive"
      })
    } finally {
      setIsDeletingSelected(false)
    }
  }, [clearSelection, onDeleteTransactions, selectedTransactionIds, toast])

  const handleRowClick = useCallback(
    (event: MouseEvent<HTMLTableRowElement>, row: (typeof rows)[number]) => {
      const isModifiedClick = event.ctrlKey || event.metaKey || event.shiftKey

      if (row.kind === "bill") {
        if (isModifiedClick) {
          event.preventDefault()
          toast({
            title:
              "Turn on inline credit card transactions to select bill purchases"
          })
          return
        }
        navigate(
          `/credit-card-bills/${row.bill.accountId}/${row.bill.billMonth}`
        )
        return
      }

      if (event.shiftKey) {
        event.preventDefault()
        setSelectedTransactionIds((currentSelection) =>
          selectTransactionRange(
            transactionIds,
            selectionAnchorId,
            row.transaction.id,
            currentSelection
          )
        )
        setSelectionAnchorId((currentAnchor) =>
          currentAnchor && transactionIdSet.has(currentAnchor)
            ? currentAnchor
            : row.transaction.id
        )
        return
      }

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        setSelectedTransactionIds((currentSelection) =>
          toggleTransactionSelection(currentSelection, row.transaction.id)
        )
        setSelectionAnchorId(row.transaction.id)
        return
      }

      setSelectedTransactionId(row.transaction.id)
      setIsDetailsOpen(true)
    },
    [navigate, selectionAnchorId, toast, transactionIds, transactionIdSet]
  )

  const allTransactionsSelected =
    transactionIds.length > 0 &&
    selectedTransactionIds.size === transactionIds.length

  if (isError) {
    return (
      <div className="min-h-56 border-2 border-fina-ink bg-fina-danger p-6 font-black uppercase shadow-fina-lg">
        We could not load the grouped ledger. Try again in a moment.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="border-2 border-fina-ink bg-fina-surface p-4 shadow-fina-lg">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton
            key={index}
            className="mb-2 h-20 rounded-none bg-fina-ink/10"
          />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-start justify-between border-2 border-fina-ink bg-fina-lime p-6 shadow-fina-lg">
        <FinaBadge tone="surface">Ledger empty</FinaBadge>
        <div className="flex w-full items-end justify-between gap-6">
          <p className="max-w-xl text-3xl font-black uppercase leading-[0.9] tracking-[-0.06em] md:text-5xl">
            No entries in this period. Yet.
          </p>
          <ArrowUpRight className="size-12 shrink-0 md:size-20" />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative max-h-[78svh] min-h-64 overflow-auto border-2 border-fina-ink bg-fina-surface shadow-fina-lg"
    >
      <Table className="grid min-w-[760px] text-xs">
        <TableHeader className="sticky top-0 z-10 grid bg-fina-lime">
          <TableRow className="flex w-full border-0">
            <TableHead className="flex h-10 w-[120px] shrink-0 items-center border-b-2 border-r border-fina-ink px-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-fina-ink">
              {dateBasis === "monthly-review" ? "Date" : "Flow date"}
            </TableHead>
            <TableHead className="flex h-10 min-w-0 flex-1 items-center border-b-2 border-r border-fina-ink px-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-fina-ink">
              Transaction
            </TableHead>
            <TableHead className="flex h-10 w-[180px] shrink-0 items-center justify-end border-b-2 border-fina-ink px-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-fina-ink">
              Value
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody
          className="relative grid"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            if (!row) return null
            const isBill = row.kind === "bill"
            const isSelected =
              row.kind === "transaction" &&
              selectedTransactionIds.has(row.transaction.id)
            const status = isBill ? statusDetails[row.bill.status] : null
            return (
              <TableRow
                key={row.key}
                tabIndex={0}
                data-testid={
                  isBill ? "credit-card-bill-row" : "grouped-transaction-row"
                }
                aria-selected={isBill ? undefined : isSelected}
                className={cn(
                  "absolute left-0 flex w-full cursor-pointer border-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fina-violet",
                  isSelected
                    ? "bg-fina-sky hover:bg-fina-sky"
                    : isBill
                      ? "bg-fina-sky hover:bg-fina-yellow"
                      : "bg-fina-surface hover:bg-fina-yellow"
                )}
                style={{
                  height: `${ROW_HEIGHT}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
                onClick={(event) => handleRowClick(event, row)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    event.currentTarget.click()
                  }
                }}
              >
                <TableCell className="flex h-full w-[120px] shrink-0 items-center border-b border-r border-fina-ink px-3">
                  <span className="font-mono text-[11px] font-black">
                    {row.date
                      ? dayjs(row.date).format(
                          dateBasis === "monthly-review"
                            ? row.kind === "bill"
                              ? "MMM YYYY"
                              : "DD MMM YYYY"
                            : "DD.MM.YY"
                        )
                      : "—"}
                    {row.kind === "bill" &&
                    row.bill.status !== "empty" &&
                    dateBasis === "cash-flow" ? (
                      <span className="mt-1 block text-[8px] uppercase text-fina-ink/60">
                        {row.bill.payment ? "Paid" : "Scheduled"}
                      </span>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="flex h-full min-w-0 flex-1 items-center border-b border-r border-fina-ink px-3">
                  {row.kind === "bill" ? (
                    <div className="min-w-0 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CreditCard className="size-4 shrink-0" />
                        <span className="truncate text-sm font-black uppercase tracking-[-0.02em]">
                          {row.bill.accountName} bill
                        </span>
                        {status ? (
                          <FinaBadge tone={status.tone}>
                            {status.label}
                          </FinaBadge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold uppercase text-fina-ink/60">
                        <span>
                          Due {dayjs(row.bill.dueDate).format("DD MMM YYYY")}
                        </span>
                        <span aria-hidden="true">/</span>
                        <span>{row.bill.transactionCount} transactions</span>
                        {row.bill.payment ? (
                          <>
                            <span aria-hidden="true">/</span>
                            <span>
                              Paid from {row.bill.payment.accountName}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <TransactionLedgerTransaction
                      transaction={row.transaction}
                      categories={categories}
                      onUpdateTransaction={onUpdateTransaction}
                    />
                  )}
                </TableCell>
                <TableCell className="flex h-full w-[180px] shrink-0 items-center justify-end border-b border-fina-ink px-3">
                  <span
                    className={cn(
                      "whitespace-nowrap border border-fina-ink px-2.5 py-1.5 font-mono text-sm font-black",
                      row.value === 0
                        ? "bg-fina-surface text-fina-ink"
                        : row.value > 0
                          ? "bg-fina-lime text-fina-ink"
                          : "bg-fina-ink text-white"
                    )}
                  >
                    {currencyFormatter.format(row.value)}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {selectedTransactionIndex >= 0 ? (
        <TransactionDetailsModal
          transaction={visibleTransactions[selectedTransactionIndex] || null}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          totalTransactions={visibleTransactions.length}
          currentTransactionIndex={selectedTransactionIndex}
          onNextTransaction={() => {
            const next = Math.min(
              selectedTransactionIndex + 1,
              visibleTransactions.length - 1
            )
            setSelectedTransactionId(visibleTransactions[next]?.id || null)
          }}
          onPreviousTransaction={() => {
            const previous = Math.max(selectedTransactionIndex - 1, 0)
            setSelectedTransactionId(visibleTransactions[previous]?.id || null)
          }}
        />
      ) : null}

      {selectedTransactionIds.size > 0 ? (
        <TransactionBulkActions
          selectedCount={selectedTransactionIds.size}
          allSelected={allTransactionsSelected}
          isDeleting={isDeletingSelected}
          onSelectAll={selectAllTransactions}
          onClearSelection={clearSelection}
          onDelete={deleteSelectedTransactions}
        />
      ) : null}
    </div>
  )
}
