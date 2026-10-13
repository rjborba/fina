import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCategories } from "@/data/categories/useCategories"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { TransactionOutput as Transaction } from "@fina/types"
import { type Virtualizer, useVirtualizer } from "@tanstack/react-virtual"
import dayjs from "dayjs"
import { ArrowUpRight } from "lucide-react"
import {
  type FC,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { TransactionDetailsModal } from "./TransactionDetailsModal"
import { TransactionBulkActions } from "./TransactionBulkActions"
import { Skeleton } from "../ui/skeleton"
import {
  assignCategoryToTransactionSelection,
  assignCardToTransactionSelection,
  selectedCreditAccountId,
  selectTransactionRange,
  summarizeTransactionSelection,
  toggleTransactionSelection
} from "./transactionSelection"
import { sortTransactions, type TransactionSortOption } from "./transactionSort"
import {
  TransactionLedgerTransaction,
  type TransactionCategoryOption
} from "./TransactionLedgerTransaction"
import { useTransactionDetailsNavigation } from "./useTransactionDetailsNavigation"
import { useTransactionListKeyboard } from "./useTransactionListKeyboard"
import {
  DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
  type TransactionDisplayProperties
} from "./transactionDisplay"
import {
  TRANSACTION_LIST_OVERSCAN,
  TRANSACTION_LIST_ROW_HEIGHT,
  VirtualizedTransactionList,
  VirtualizedTransactionRow
} from "./VirtualizedTransactionList"
import { buildTransactionRowLayout } from "./transactionRowLayout"

export interface TransactionsListProps {
  data?: Transaction[] | null
  totalCount?: number
  sort: TransactionSortOption
  dateBasis?: "cash-flow" | "monthly-review" | "purchase-date"
  fillAvailableSpace?: boolean
  displayProperties?: TransactionDisplayProperties
  isLoading: boolean
  isError: boolean
  onUpdateTransaction: (
    id: string,
    transaction: Partial<Transaction>
  ) => Promise<void>
  onDeleteTransactions: (ids: string[]) => Promise<void>
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
})

const formatCurrency = (value: number) => currencyFormatter.format(value)

interface TransactionLedgerProps {
  transactions: readonly Transaction[]
  totalCount: number
  dateBasis: NonNullable<TransactionsListProps["dateBasis"]>
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>
  selectedTransactionIds: Set<string>
  focusedRowKey: string | null
  onRowFocus: (key: string) => void
  onRowHover: (key: string | null) => void
  categories: TransactionCategoryOption[]
  displayProperties: TransactionDisplayProperties
  onUpdateTransaction: TransactionsListProps["onUpdateTransaction"]
  onRowClick: (event: MouseEvent<HTMLDivElement>, transactionId: string) => void
  onSelectionClick: (
    event: MouseEvent<HTMLButtonElement>,
    transactionId: string
  ) => void
  selectionDisabled: boolean
}

const TransactionLedger = function TransactionLedger({
  transactions,
  totalCount,
  dateBasis,
  rowVirtualizer,
  selectedTransactionIds,
  focusedRowKey,
  onRowFocus,
  onRowHover,
  categories,
  displayProperties,
  onUpdateTransaction,
  onRowClick,
  onSelectionClick,
  selectionDisabled
}: TransactionLedgerProps) {
  const layout = useMemo(
    () => buildTransactionRowLayout(transactions, displayProperties),
    [transactions, displayProperties]
  )

  return (
    <VirtualizedTransactionList
      rowCount={totalCount}
      totalSize={rowVirtualizer.getTotalSize()}
      displayProperties={displayProperties}
      layout={layout}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const transaction = transactions[virtualRow.index]
        if (!transaction) return null
        const isSelected = selectedTransactionIds.has(transaction.id)
        const isFocused = focusedRowKey === transaction.id
        const date =
          dateBasis === "monthly-review"
            ? transaction.date?.slice(0, 10)
            : dateBasis === "purchase-date"
              ? transaction.date
              : (transaction.cashFlowDate ?? transaction.calculatedDate)
        const formattedDate = date
          ? dayjs(date).format(
              dateBasis === "monthly-review" ? "DD MMM YYYY" : "DD.MM.YY"
            )
          : "—"

        return (
          <VirtualizedTransactionRow
            key={transaction.id}
            rowKey={transaction.id}
            index={virtualRow.index}
            start={virtualRow.start}
            isSelected={isSelected}
            isFocused={isFocused}
            selectionDisabled={selectionDisabled}
            onSelectionClick={(event) =>
              onSelectionClick(event, transaction.id)
            }
            tabIndex={
              isFocused || (!focusedRowKey && virtualRow.index === 0) ? 0 : -1
            }
            onFocus={() => onRowFocus(transaction.id)}
            onMouseEnter={() => onRowHover(transaction.id)}
            onMouseLeave={() => onRowHover(null)}
            onClick={(event) => onRowClick(event, transaction.id)}
          >
            {displayProperties.date ? (
              <div
                data-column="date"
                className="flex h-full min-w-0 items-center"
              >
                <span className="sr-only">
                  {dateBasis === "cash-flow"
                    ? "Flow date: "
                    : dateBasis === "purchase-date"
                      ? "Purchase date: "
                      : "Date: "}
                </span>
                <span
                  data-field-value="true"
                  className="truncate whitespace-nowrap text-xs tabular-nums text-foreground/45"
                >
                  {formattedDate}
                </span>
              </div>
            ) : null}
            <div
              data-column="transaction"
              className="flex h-full min-w-0 items-center"
            >
              <TransactionLedgerTransaction
                transaction={transaction}
                categories={categories}
                layout={layout}
                onUpdateTransaction={onUpdateTransaction}
                disabled={selectionDisabled}
              />
            </div>
            {displayProperties.value ? (
              <div
                data-column="value"
                className="flex h-full min-w-0 items-center justify-end"
              >
                <span className="sr-only">
                  {transaction.value === null
                    ? "Value: unavailable"
                    : "Value: "}
                </span>
                <span
                  data-field-value="true"
                  aria-hidden={transaction.value === null || undefined}
                  className={cn(
                    "whitespace-nowrap text-[13px] tabular-nums",
                    transaction.value !== null && transaction.value > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                  )}
                >
                  {transaction.value !== null
                    ? formatCurrency(transaction.value)
                    : "—"}
                </span>
              </div>
            ) : null}
          </VirtualizedTransactionRow>
        )
      })}
    </VirtualizedTransactionList>
  )
}

const NoTransactions = () => (
  <div className="flex min-h-56 flex-col items-center justify-center bg-fina-surface px-6 py-8 text-center dark:bg-fina-canvas">
    <div className="flex size-10 items-center justify-center rounded-lg bg-fina-lime text-fina-violet">
      <ArrowUpRight className="size-5" />
    </div>
    <p className="mt-3 text-[13px] text-foreground/55">No transactions</p>
  </div>
)

const TransactionsLoading = () => (
  <div className="bg-fina-surface px-6 py-2 dark:bg-fina-canvas">
    {Array.from({ length: 12 }).map((_, index) => (
      <div key={index} className="flex h-10 items-center gap-3">
        <Skeleton className="h-3 w-24 rounded-sm bg-foreground/5" />
        <Skeleton className="h-3 flex-1 rounded-sm bg-foreground/5" />
        <Skeleton className="h-3 w-28 rounded-sm bg-foreground/5" />
      </div>
    ))}
  </div>
)

const TransactionsError = () => (
  <div className="flex min-h-56 items-center justify-center bg-fina-surface p-6 text-[13px] text-red-700 dark:bg-fina-canvas dark:text-red-300">
    We could not load the ledger. Try again in a moment.
  </div>
)

const TransactionsList: FC<TransactionsListProps> = ({
  data,
  totalCount = data?.length ?? 0,
  sort,
  dateBasis = "cash-flow",
  fillAvailableSpace = false,
  displayProperties = DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
  isLoading,
  isError,
  onUpdateTransaction,
  onDeleteTransactions
}) => {
  const listContainerRef = useRef<HTMLDivElement>(null)
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
    () => sortTransactions(data || [], sort, dateBasis),
    [data, sort, dateBasis]
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
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)
  const [isUpdatingCard, setIsUpdatingCard] = useState(false)
  const isSelectionBusy =
    isDeletingSelected || isUpdatingCategory || isUpdatingCard
  const cardAccountId = useMemo(
    () => selectedCreditAccountId(sortedData, selectedTransactionIds),
    [sortedData, selectedTransactionIds]
  )

  useEffect(() => {
    setSelectedTransactionIds(new Set())
    setSelectionAnchorId(null)
  }, [selectedGroup?.id])

  useEffect(() => {
    if (isLoading || isError || data === undefined) return
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
  }, [data, isLoading, isError, transactionIdSet])

  const rowVirtualizer = useVirtualizer({
    count: sortedData.length,
    estimateSize: () => TRANSACTION_LIST_ROW_HEIGHT,
    getItemKey: (index) => sortedData[index]?.id || index,
    getScrollElement: () => listContainerRef.current,
    overscan: TRANSACTION_LIST_OVERSCAN
  })

  const detailsNavigation = useTransactionDetailsNavigation(
    sortedData,
    selectedGroup?.id
  )
  const { openTransaction } = detailsNavigation

  const clearSelection = useCallback(() => {
    setSelectedTransactionIds(new Set())
    setSelectionAnchorId(null)
  }, [])

  const selectAllTransactions = useCallback(() => {
    setSelectedTransactionIds(new Set(transactionIds))
  }, [transactionIds])

  const toggleSelection = useCallback((transactionId: string) => {
    setSelectedTransactionIds((currentSelection) =>
      toggleTransactionSelection(currentSelection, transactionId)
    )
    setSelectionAnchorId(transactionId)
  }, [])

  const extendSelection = useCallback(
    (anchorId: string, targetId: string) => {
      const anchor = selectionAnchorId ?? anchorId
      setSelectedTransactionIds((currentSelection) =>
        selectTransactionRange(
          transactionIds,
          anchor,
          targetId,
          currentSelection
        )
      )
      setSelectionAnchorId(anchor)
    },
    [selectionAnchorId, transactionIds]
  )

  const scrollToIndex = useCallback(
    (index: number) => {
      rowVirtualizer.scrollToIndex(index, { align: "auto" })
    },
    [rowVirtualizer]
  )

  const { focusedRowKey, setFocusedRowKey, setHoveredRowKey } =
    useTransactionListKeyboard({
      containerRef: listContainerRef,
      rowKeys: transactionIds,
      enabled: !isLoading && !isError && !isSelectionBusy,
      onOpen: openTransaction,
      onToggleSelection: toggleSelection,
      onExtendSelection: extendSelection,
      onSelectAll: selectAllTransactions,
      onClearSelection: clearSelection,
      scrollToIndex
    })

  const deleteSelectedTransactions = useCallback(async () => {
    const ids = [...selectedTransactionIds]

    if (ids.length === 0 || isSelectionBusy) {
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
      throw new Error("Could not delete the selected transactions")
    } finally {
      setIsDeletingSelected(false)
    }
  }, [
    clearSelection,
    isSelectionBusy,
    onDeleteTransactions,
    selectedTransactionIds,
    toast
  ])

  const assignSelectedCategory = useCallback(
    async (categoryId: string | null) => {
      const ids = [...selectedTransactionIds]
      if (ids.length === 0 || isSelectionBusy) return
      const category =
        categoryId === null
          ? null
          : categories.find((item) => item.id === categoryId)
      if (category === undefined) throw new Error("Category is unavailable")
      setIsUpdatingCategory(true)
      try {
        const { updatedCount, failedCount } =
          await assignCategoryToTransactionSelection(
            ids,
            category,
            onUpdateTransaction
          )
        if (failedCount > 0) {
          toast({
            title: "Could not update all selected transactions",
            description: `${updatedCount} updated; ${failedCount} failed. You can retry the selection.`,
            variant: "destructive"
          })
          throw new Error("Could not update all selected transactions")
        }
        toast({
          title: `${updatedCount} transaction${updatedCount === 1 ? "" : "s"} updated`
        })
      } finally {
        setIsUpdatingCategory(false)
      }
    },
    [
      categories,
      isSelectionBusy,
      onUpdateTransaction,
      selectedTransactionIds,
      toast
    ]
  )

  const assignSelectedCard = async (creditCard: Transaction["creditCard"]) => {
    if (
      isSelectionBusy ||
      !cardAccountId ||
      (creditCard && creditCard.accountId !== cardAccountId)
    )
      return
    setIsUpdatingCard(true)
    try {
      const { updatedCount, failedCount } =
        await assignCardToTransactionSelection(
          [...selectedTransactionIds],
          creditCard,
          onUpdateTransaction
        )
      if (failedCount > 0) {
        toast({
          title: "Could not assign every selected purchase",
          description: `${updatedCount} updated; ${failedCount} failed. You can retry the selection.`,
          variant: "destructive"
        })
        throw new Error("Could not assign every selected purchase")
      }
      toast({
        title: `${updatedCount} purchase${updatedCount === 1 ? "" : "s"} updated`
      })
    } finally {
      setIsUpdatingCard(false)
    }
  }

  const handleSelectionClick = useCallback(
    (event: MouseEvent<HTMLElement>, transactionId: string) => {
      if (isSelectionBusy) return
      setFocusedRowKey(transactionId)
      setSelectedTransactionIds((currentSelection) =>
        event.shiftKey
          ? selectTransactionRange(
              transactionIds,
              selectionAnchorId,
              transactionId,
              currentSelection
            )
          : toggleTransactionSelection(currentSelection, transactionId)
      )
      setSelectionAnchorId((currentAnchor) =>
        event.shiftKey && currentAnchor && transactionIdSet.has(currentAnchor)
          ? currentAnchor
          : transactionId
      )
    },
    [
      isSelectionBusy,
      selectionAnchorId,
      setFocusedRowKey,
      transactionIds,
      transactionIdSet
    ]
  )

  const handleRowClick = useCallback(
    (event: MouseEvent<HTMLDivElement>, transactionId: string) => {
      if (isSelectionBusy) {
        event.preventDefault()
        return
      }
      setFocusedRowKey(transactionId)
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        event.preventDefault()
        handleSelectionClick(event, transactionId)
        return
      }

      openTransaction(transactionId)
    },
    [isSelectionBusy, openTransaction, handleSelectionClick, setFocusedRowKey]
  )

  const allTransactionsSelected =
    transactionIds.length > 0 &&
    selectedTransactionIds.size === transactionIds.length
  const selectionSummary = useMemo(
    () => summarizeTransactionSelection(sortedData, selectedTransactionIds),
    [sortedData, selectedTransactionIds]
  )

  const content = isError ? (
    <TransactionsError />
  ) : isLoading || data === undefined ? (
    <TransactionsLoading />
  ) : !data || data.length === 0 ? (
    <NoTransactions />
  ) : (
    <TransactionLedger
      transactions={sortedData}
      totalCount={totalCount}
      dateBasis={dateBasis}
      rowVirtualizer={rowVirtualizer}
      selectedTransactionIds={selectedTransactionIds}
      focusedRowKey={focusedRowKey}
      onRowFocus={setFocusedRowKey}
      onRowHover={setHoveredRowKey}
      categories={categories}
      displayProperties={displayProperties}
      onUpdateTransaction={onUpdateTransaction}
      onRowClick={handleRowClick}
      onSelectionClick={handleSelectionClick}
      selectionDisabled={isSelectionBusy}
    />
  )

  return (
    <div
      className={cn(
        "transactions-list-shell relative min-h-64 flex-1 overflow-auto bg-fina-surface outline-none dark:bg-fina-canvas",
        selectedTransactionIds.size > 0 && "pb-28 sm:pb-20",
        !fillAvailableSpace && "max-h-[78svh]"
      )}
      ref={listContainerRef}
      tabIndex={-1}
      role="region"
      aria-label="Transaction list"
    >
      <div className={cn("min-w-0 flex-1 transition-all duration-300")}>
        {content}
        {detailsNavigation.transaction && (
          <TransactionDetailsModal {...detailsNavigation} />
        )}
      </div>
      {selectedTransactionIds.size > 0 &&
      !isLoading &&
      !isError &&
      data !== undefined ? (
        <TransactionBulkActions
          selectedCount={selectedTransactionIds.size}
          selectableCount={transactionIds.length}
          {...selectionSummary}
          categories={categories}
          allSelected={allTransactionsSelected}
          isDeleting={isDeletingSelected}
          isUpdatingCategory={isUpdatingCategory}
          isUpdatingCard={isUpdatingCard}
          cardAccountId={cardAccountId}
          onAssignCard={assignSelectedCard}
          onSelectAll={selectAllTransactions}
          onClearSelection={clearSelection}
          onDelete={deleteSelectedTransactions}
          onAssignCategory={assignSelectedCategory}
        />
      ) : null}
    </div>
  )
}

export default TransactionsList
