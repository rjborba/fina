import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCategories } from "@/data/categories/useCategories"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { TransactionOutput as Transaction } from "@fina/types"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  Row,
  type Table as TanStackTable,
  useReactTable
} from "@tanstack/react-table"
import { type Virtualizer, useVirtualizer } from "@tanstack/react-virtual"
import dayjs from "dayjs"
import { ArrowUpRight } from "lucide-react"
import React, {
  type FC,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { TransactionDetailsModal } from "./TransactionDetailsModal"
import { TransactionBulkActions } from "./TransactionBulkActions"
import { Skeleton } from "../ui/skeleton"
import {
  selectTransactionRange,
  toggleTransactionSelection
} from "./transactionSelection"
import { sortTransactions, type TransactionSortOption } from "./transactionSort"
import { TransactionLedgerTransaction } from "./TransactionLedgerTransaction"

export interface TransactionsTableProps {
  data?: Transaction[] | null
  totalCount: number
  pageIndex: number
  pageSize: number
  sort: TransactionSortOption
  isLoading: boolean
  isError: boolean
  onUpdateTransaction: (
    id: string,
    transaction: Partial<Transaction>
  ) => Promise<void>
  onDeleteTransactions: (ids: string[]) => Promise<void>
}

const columnHelper = createColumnHelper<Transaction>()

// Memoized TableRow to prevent unnecessary re-renders
const MemoizedTableRow = React.memo(TableRow)

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
})

const formatCurrency = (value: number) => currencyFormatter.format(value)
const TRANSACTION_ROW_HEIGHT = 80

interface TransactionLedgerProps {
  table: TanStackTable<Transaction>
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>
  selectedTransactionIds: Set<string>
  onRowClick: (
    event: MouseEvent<HTMLTableRowElement>,
    transactionId: string
  ) => void
}

const TransactionLedger = function TransactionLedger({
  table,
  rowVirtualizer,
  selectedTransactionIds,
  onRowClick
}: TransactionLedgerProps) {
  const { rows } = table.getRowModel()

  return (
    <Table className="transactions-table grid min-w-[760px] text-xs">
      <TableHeader className="sticky top-0 z-10 grid bg-fina-lime">
        {table.getHeaderGroups().map((headerGroup) => (
          <MemoizedTableRow
            key={headerGroup.id}
            className="flex w-full border-0"
          >
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                data-column={header.column.id}
                className="flex h-10 items-center border-b-2 border-r border-fina-ink px-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-fina-ink last:border-r-0"
                style={{
                  width: header.getSize(),
                  flex:
                    header.column.id === "transaction"
                      ? `1 1 ${header.getSize()}px`
                      : `0 0 ${header.getSize()}px`
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </TableHead>
            ))}
          </MemoizedTableRow>
        ))}
      </TableHeader>
      <TableBody
        className="relative grid"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative"
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index] as Row<Transaction>
          const isSelected = selectedTransactionIds.has(row.original.id)
          const isCreditCardTransaction =
            row.original.bankaccount?.type === "credit"

          return (
            <MemoizedTableRow
              key={virtualRow.key}
              data-index={virtualRow.index}
              aria-selected={isSelected}
              className={cn(
                "absolute left-0 flex w-full cursor-pointer select-none border-0",
                isSelected
                  ? "bg-fina-lime hover:bg-fina-lime"
                  : "bg-fina-surface hover:bg-fina-yellow"
              )}
              style={{
                height: `${TRANSACTION_ROW_HEIGHT}px`,
                transform: `translateY(${virtualRow.start}px)`,
                boxShadow:
                  isCreditCardTransaction && !isSelected
                    ? "inset 5px 0 0 var(--fina-sky)"
                    : undefined
              }}
              onClick={(event) => onRowClick(event, row.original.id)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  data-column={cell.column.id}
                  className="flex h-full items-center border-b border-r border-fina-ink px-3 py-0 text-fina-ink last:border-r-0"
                  style={{
                    width: cell.column.getSize(),
                    flex:
                      cell.column.id === "transaction"
                        ? `1 1 ${cell.column.getSize()}px`
                        : `0 0 ${cell.column.getSize()}px`
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </MemoizedTableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

const NoTransactions = () => (
  <div className="flex min-h-64 flex-col items-start justify-between bg-fina-lime p-6">
    <span className="border-2 border-fina-ink bg-fina-surface px-2 py-1 font-mono text-[10px] font-black uppercase">
      Ledger empty
    </span>
    <div className="flex w-full items-end justify-between gap-6">
      <p className="max-w-xl text-3xl font-black uppercase leading-[0.9] tracking-[-0.06em] md:text-5xl">
        No money moves in this period. Yet.
      </p>
      <ArrowUpRight className="size-12 shrink-0 md:size-20" strokeWidth={3} />
    </div>
  </div>
)

const TransactionsLoading = () => (
  <div className="flex flex-col gap-2 bg-fina-surface p-4">
    {Array.from({ length: 12 }).map((_, index) => (
      <div key={index} className="flex h-20 gap-3">
        <Skeleton className="h-full w-24 rounded-none bg-fina-ink/10" />
        <div className="flex flex-1 flex-col gap-2 py-2">
          <Skeleton className="h-5 w-3/5 rounded-none bg-fina-ink/10" />
          <Skeleton className="h-4 w-4/5 rounded-none bg-fina-ink/10" />
        </div>
        <Skeleton className="h-full w-40 rounded-none bg-fina-ink/10" />
      </div>
    ))}
  </div>
)

const TransactionsError = () => (
  <div className="min-h-56 bg-fina-danger p-6 font-black uppercase">
    We could not load the ledger. Try again in a moment.
  </div>
)

const TransactionsTable: FC<TransactionsTableProps> = ({
  data,
  totalCount,
  pageIndex,
  pageSize,
  sort,
  isLoading,
  isError,
  onUpdateTransaction,
  onDeleteTransactions
}) => {
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const { selectedGroup } = useActiveGroup()
  const { toast } = useToast()

  const { data: categoriesData } = useCategories({
    groupId: selectedGroup?.id?.toString()
  })

  const categories = useMemo(() => {
    return (
      categoriesData?.map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color
      })) || []
    )
  }, [categoriesData])

  const sortedData = useMemo(
    () => sortTransactions(data || [], sort),
    [data, sort]
  )
  const transactionIds = useMemo(
    () => sortedData.map((transaction) => transaction.id),
    [sortedData]
  )
  const transactionIdSet = useMemo(
    () => new Set(transactionIds),
    [transactionIds]
  )
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    Set<string>
  >(() => new Set())
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(
    null
  )
  const [isDeletingSelected, setIsDeletingSelected] = useState(false)

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

  const columns = useMemo(
    () => [
      columnHelper.accessor("calculatedDate", {
        id: "date",
        header: "Date",
        size: 88,
        cell: (info) => {
          return (
            <span className="font-mono text-[11px] font-black">
              {dayjs(info.getValue()).format("DD.MM.YY")}
            </span>
          )
        }
      }),
      columnHelper.accessor("description", {
        id: "transaction",
        header: "Transaction",
        size: 512,
        cell: ({ row }) => (
          <TransactionLedgerTransaction
            transaction={row.original}
            categories={categories}
            onUpdateTransaction={onUpdateTransaction}
          />
        )
      }),
      columnHelper.accessor("value", {
        id: "value",
        header: "Value",
        size: 160,
        cell: ({ row }) => {
          return (
            <div className="flex h-full items-center justify-end">
              {row.original.value ? (
                <div
                  className={cn(
                    "inline-flex whitespace-nowrap border border-fina-ink px-2.5 py-1.5 font-mono text-sm font-black",
                    row.original.value > 0
                      ? "bg-fina-lime text-fina-ink"
                      : "bg-fina-ink text-white"
                  )}
                >
                  {formatCurrency(row.original.value)}
                </div>
              ) : (
                <span className="font-mono text-sm font-black">-</span>
              )}
            </div>
          )
        }
      })
    ],
    [categories, onUpdateTransaction]
  )

  const table = useReactTable({
    data: sortedData,
    columns,
    getRowId: (transaction) => transaction.id,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    rowCount: totalCount,
    state: {
      pagination: {
        pageIndex,
        pageSize
      }
    }
  })

  const rowVirtualizer = useVirtualizer({
    count: sortedData.length,
    estimateSize: () => TRANSACTION_ROW_HEIGHT,
    getItemKey: (index) => sortedData[index]?.id || index,
    getScrollElement: () => tableContainerRef.current,
    overscan: 15
  })

  const [isTransactionsDetailsModalOpen, setIsTransactionsDetailsModalOpen] =
    useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null)
  const selectedTransactionIndex = selectedTransactionId
    ? sortedData.findIndex(
        (transaction) => transaction.id === selectedTransactionId
      )
    : -1

  const clearSelection = useCallback(() => {
    setSelectedTransactionIds(new Set())
    setSelectionAnchorId(null)
  }, [])

  useEffect(() => {
    if (selectedTransactionIds.size === 0) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearSelection()
      }
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

    if (ids.length === 0) {
      return
    }

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
    (event: MouseEvent<HTMLTableRowElement>, transactionId: string) => {
      if (event.shiftKey) {
        event.preventDefault()
        setSelectedTransactionIds((currentSelection) =>
          selectTransactionRange(
            transactionIds,
            selectionAnchorId,
            transactionId,
            currentSelection
          )
        )
        setSelectionAnchorId((currentAnchor) =>
          currentAnchor && transactionIdSet.has(currentAnchor)
            ? currentAnchor
            : transactionId
        )
        return
      }

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        setSelectedTransactionIds((currentSelection) =>
          toggleTransactionSelection(currentSelection, transactionId)
        )
        setSelectionAnchorId(transactionId)
        return
      }

      setSelectedTransactionId(transactionId)
      setIsTransactionsDetailsModalOpen(true)
    },
    [selectionAnchorId, transactionIds, transactionIdSet]
  )

  const handleNextTransaction = useCallback(() => {
    setSelectedTransactionId((currentId) => {
      const currentIndex = sortedData.findIndex(
        (transaction) => transaction.id === currentId
      )
      if (currentIndex < 0) return currentId

      const nextIndex = Math.min(currentIndex + 1, sortedData.length - 1)
      return sortedData[nextIndex]?.id ?? currentId
    })
  }, [sortedData])

  const handlePreviousTransaction = useCallback(() => {
    setSelectedTransactionId((currentId) => {
      const currentIndex = sortedData.findIndex(
        (transaction) => transaction.id === currentId
      )
      if (currentIndex < 0) return currentId

      return sortedData[Math.max(0, currentIndex - 1)]?.id ?? currentId
    })
  }, [sortedData])

  const allTransactionsSelected =
    transactionIds.length > 0 &&
    selectedTransactionIds.size === transactionIds.length

  const content = isError ? (
    <TransactionsError />
  ) : isLoading || data === undefined ? (
    <TransactionsLoading />
  ) : !data || data.length === 0 ? (
    <NoTransactions />
  ) : (
    <TransactionLedger
      table={table}
      rowVirtualizer={rowVirtualizer}
      selectedTransactionIds={selectedTransactionIds}
      onRowClick={handleRowClick}
    />
  )

  return (
    <div
      className="transactions-table-shell relative max-h-[78svh] min-h-64 overflow-auto border-2 border-fina-ink bg-fina-surface shadow-fina-lg"
      ref={tableContainerRef}
    >
      <div className={cn("min-w-0 flex-1 transition-all duration-300")}>
        {content}
        {selectedTransactionIndex >= 0 && (
          <TransactionDetailsModal
            transaction={sortedData[selectedTransactionIndex] || null}
            open={isTransactionsDetailsModalOpen}
            onOpenChange={setIsTransactionsDetailsModalOpen}
            totalTransactions={sortedData.length}
            currentTransactionIndex={selectedTransactionIndex}
            onNextTransaction={handleNextTransaction}
            onPreviousTransaction={handlePreviousTransaction}
          />
        )}
      </div>
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

export default TransactionsTable
