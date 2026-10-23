import { formatCurrency, formatDate } from "@/i18n"
import { useTranslation } from "react-i18next"
import { TransactionCommentButton } from "./TransactionCommentButton"
import { TransactionDetailsModal } from "@/components/transactions/TransactionDetailsModal"
import {
  TransactionAccountChip,
  CreditCardIndicator
} from "./TransactionMetadataIcons"
import { FinaBadge } from "@/components/ui/fina"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCategories } from "@/data/categories/useCategories"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { CreditCardBillSummary, TransactionOutput } from "@fina/types"
import { useVirtualizer } from "@tanstack/react-virtual"
import dayjs from "dayjs"
import { ArrowUpRight } from "lucide-react"
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
  assignCategoryToTransactionSelection,
  assignCardToTransactionSelection,
  selectedCreditAccountId,
  selectTransactionRange,
  summarizeTransactionSelection,
  toggleTransactionSelection
} from "./transactionSelection"
import { TransactionBulkActions } from "./TransactionBulkActions"
import {
  TransactionLedgerTransaction,
  type UpdateLedgerTransaction
} from "./TransactionLedgerTransaction"
import type { TransactionSortOption } from "./transactionSort"
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
import { TransactionMetadataGrid } from "./TransactionMetadataGrid"
import { buildTransactionRowLayout } from "./transactionRowLayout"

const currencyFormatter = { format: formatCurrency }

const statusDetails = {
  empty: { label: "Empty", tone: "sky" as const },
  "needs-reconciliation": {
    label: "Needs reconciliation",
    tone: "yellow" as const
  },
  reconciled: { label: "Reconciled", tone: "lime" as const },
  "needs-review": { label: "Needs review", tone: "danger" as const }
}

interface CreditCardBillsLedgerProps {
  transactions: readonly TransactionOutput[]
  bills: readonly CreditCardBillSummary[]
  sort: TransactionSortOption
  dateBasis?: "cash-flow" | "monthly-review"
  displayProperties?: TransactionDisplayProperties
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
  displayProperties = DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
  isLoading,
  isError,
  onUpdateTransaction,
  onDeleteTransactions
}: CreditCardBillsLedgerProps) {
  const { t } = useTranslation()

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
  const rowKeys = useMemo(() => rows.map((row) => row.key), [rows])
  const rowsByKey = useMemo(
    () => new Map(rows.map((row) => [row.key, row])),
    [rows]
  )
  const visibleTransactions = useMemo(
    () =>
      rows.flatMap((row) =>
        row.kind === "transaction" ? [row.transaction] : []
      ),
    [rows]
  )
  const layout = useMemo(
    () =>
      buildTransactionRowLayout(visibleTransactions, displayProperties, {
        hasBills: rows.some((row) => row.kind === "bill")
      }),
    [visibleTransactions, displayProperties, rows]
  )
  const transactionIds = useMemo(
    () => visibleTransactions.map((transaction) => transaction.id),
    [visibleTransactions]
  )
  const transactionIdSet = useMemo(
    () => new Set(transactionIds),
    [transactionIds]
  )
  const detailsNavigation = useTransactionDetailsNavigation(
    visibleTransactions,
    selectedGroup?.id
  )
  const { openTransaction } = detailsNavigation
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
    () => selectedCreditAccountId(visibleTransactions, selectedTransactionIds),
    [visibleTransactions, selectedTransactionIds]
  )

  useEffect(() => {
    setSelectedTransactionIds(new Set())
    setSelectionAnchorId(null)
  }, [selectedGroup?.id])
  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => TRANSACTION_LIST_ROW_HEIGHT,
    getItemKey: (index) => rows[index]?.key || index,
    getScrollElement: () => containerRef.current,
    overscan: TRANSACTION_LIST_OVERSCAN
  })

  useEffect(() => {
    if (isLoading || isError) return
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
  }, [isLoading, isError, transactionIdSet])

  const clearSelection = useCallback(() => {
    setSelectedTransactionIds(new Set())
    setSelectionAnchorId(null)
  }, [])

  const selectAllTransactions = useCallback(() => {
    setSelectedTransactionIds(new Set(transactionIds))
  }, [transactionIds])

  const openRow = useCallback(
    (key: string) => {
      const row = rowsByKey.get(key)
      if (!row) return
      if (row.kind === "bill") {
        navigate(
          `/credit-card-bills/${row.bill.accountId}/${row.bill.billMonth}`
        )
      } else {
        openTransaction(row.transaction.id)
      }
    },
    [navigate, openTransaction, rowsByKey]
  )

  const toggleSelection = useCallback(
    (key: string) => {
      const row = rowsByKey.get(key)
      if (!row) return
      if (row.kind === "bill") {
        toast({
          title: t(
            "Turn on inline credit card transactions to select bill purchases"
          )
        })
        return
      }
      setSelectedTransactionIds((currentSelection) =>
        toggleTransactionSelection(currentSelection, row.transaction.id)
      )
      setSelectionAnchorId(row.transaction.id)
    },
    [t, rowsByKey, toast]
  )

  const extendSelection = useCallback(
    (anchorKey: string, targetKey: string) => {
      const anchorRow = rowsByKey.get(anchorKey)
      const targetRow = rowsByKey.get(targetKey)
      if (targetRow?.kind !== "transaction") return
      const anchorId =
        selectionAnchorId ??
        (anchorRow?.kind === "transaction"
          ? anchorRow.transaction.id
          : targetRow.transaction.id)
      setSelectedTransactionIds((currentSelection) =>
        selectTransactionRange(
          transactionIds,
          anchorId,
          targetRow.transaction.id,
          currentSelection
        )
      )
      setSelectionAnchorId(anchorId)
    },
    [rowsByKey, selectionAnchorId, transactionIds]
  )

  const scrollToIndex = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: "auto" })
    },
    [virtualizer]
  )

  const { focusedRowKey, setFocusedRowKey, setHoveredRowKey } =
    useTransactionListKeyboard({
      containerRef,
      rowKeys,
      enabled: !isLoading && !isError && !isSelectionBusy,
      onOpen: openRow,
      onToggleSelection: toggleSelection,
      onExtendSelection: extendSelection,
      onSelectAll: selectAllTransactions,
      onClearSelection: clearSelection,
      scrollToIndex
    })

  const deleteSelectedTransactions = useCallback(async () => {
    const ids = [...selectedTransactionIds]
    if (ids.length === 0 || isSelectionBusy) return

    setIsDeletingSelected(true)
    try {
      await onDeleteTransactions(ids)
      clearSelection()
      toast({
        title: t("transactionsDeleted", { count: ids.length })
      })
    } catch {
      toast({
        title: t("Could not delete the selected transactions"),
        variant: "destructive"
      })
      throw new Error("Could not delete the selected transactions")
    } finally {
      setIsDeletingSelected(false)
    }
  }, [
    t,
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
            title: t("Could not update all selected transactions"),
            description: t(
              "{{value0}} updated; {{value1}} failed. You can retry the selection.",
              { value0: updatedCount, value1: failedCount }
            ),
            variant: "destructive"
          })
          throw new Error("Could not update all selected transactions")
        }
        toast({
          title: t("transactionsUpdated", { count: updatedCount })
        })
      } finally {
        setIsUpdatingCategory(false)
      }
    },
    [
      t,
      categories,
      isSelectionBusy,
      onUpdateTransaction,
      selectedTransactionIds,
      toast
    ]
  )

  const assignSelectedCard = async (
    card: Pick<TransactionOutput, "cardName" | "cardLast4">
  ) => {
    if (isSelectionBusy || !cardAccountId) return
    setIsUpdatingCard(true)
    try {
      const { updatedCount, failedCount } =
        await assignCardToTransactionSelection(
          [...selectedTransactionIds],
          card,
          onUpdateTransaction
        )
      if (failedCount > 0) {
        toast({
          title: t("Could not assign every selected purchase"),
          description: t(
            "{{value0}} updated; {{value1}} failed. You can retry the selection.",
            { value0: updatedCount, value1: failedCount }
          ),
          variant: "destructive"
        })
        throw new Error("Could not assign every selected purchase")
      }
      toast({
        title: t("purchasesUpdated", { count: updatedCount })
      })
    } finally {
      setIsUpdatingCard(false)
    }
  }

  const handleSelectionClick = useCallback(
    (event: MouseEvent<HTMLElement>, transactionId: string) => {
      if (isSelectionBusy) return
      setFocusedRowKey(`transaction-${transactionId}`)
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
    (event: MouseEvent<HTMLDivElement>, row: (typeof rows)[number]) => {
      if (isSelectionBusy) {
        event.preventDefault()
        return
      }
      setFocusedRowKey(row.key)
      const isModifiedClick = event.ctrlKey || event.metaKey || event.shiftKey

      if (row.kind === "bill") {
        if (isModifiedClick) {
          event.preventDefault()
          toast({
            title: t(
              "Turn on inline credit card transactions to select bill purchases"
            )
          })
          return
        }
        navigate(
          `/credit-card-bills/${row.bill.accountId}/${row.bill.billMonth}`
        )
        return
      }

      if (isModifiedClick) {
        event.preventDefault()
        handleSelectionClick(event, row.transaction.id)
        return
      }

      openTransaction(row.transaction.id)
    },
    [
      t,
      isSelectionBusy,
      navigate,
      openTransaction,
      handleSelectionClick,
      toast,
      setFocusedRowKey
    ]
  )

  const allTransactionsSelected =
    transactionIds.length > 0 &&
    selectedTransactionIds.size === transactionIds.length
  const selectionSummary = useMemo(
    () =>
      summarizeTransactionSelection(
        visibleTransactions,
        selectedTransactionIds
      ),
    [visibleTransactions, selectedTransactionIds]
  )

  if (isError) {
    return (
      <div className="flex min-h-56 flex-1 items-center justify-center bg-fina-surface p-6 text-[13px] text-red-700 dark:bg-fina-canvas dark:text-red-300">
        {t("We could not load the grouped ledger. Try again in a moment.")}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-fina-surface px-6 py-2 dark:bg-fina-canvas">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton
            key={index}
            className="my-3 h-4 rounded-sm bg-foreground/5"
          />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-56 flex-1 flex-col items-center justify-center bg-fina-surface px-6 py-8 text-center dark:bg-fina-canvas">
        <div className="flex size-10 items-center justify-center rounded-lg bg-fina-lime text-fina-violet">
          <ArrowUpRight className="size-5" />
        </div>
        <p className="mt-3 text-[13px] text-foreground/55">
          {t("No transactions")}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="region"
      aria-label={t("Transaction list")}
      className={cn(
        "transactions-list-shell relative min-h-64 flex-1 overflow-auto bg-fina-surface outline-none dark:bg-fina-canvas",
        selectedTransactionIds.size > 0 && "pb-28 sm:pb-20"
      )}
    >
      <VirtualizedTransactionList
        rowCount={rows.length}
        totalSize={virtualizer.getTotalSize()}
        displayProperties={displayProperties}
        layout={layout}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index]
          if (!row) return null
          const isBill = row.kind === "bill"
          const isSelected =
            row.kind === "transaction" &&
            selectedTransactionIds.has(row.transaction.id)
          const status = isBill ? statusDetails[row.bill.status] : null
          const isFocused = focusedRowKey === row.key
          const formattedDate = row.date
            ? dateBasis === "monthly-review"
              ? dayjs(row.date).format(
                  row.kind === "bill" ? "MMM YYYY" : "DD MMM YYYY"
                )
              : formatDate(row.date, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit"
                })
            : "—"
          return (
            <VirtualizedTransactionRow
              key={row.key}
              rowKey={row.key}
              index={virtualRow.index}
              start={virtualRow.start}
              flagged={
                row.kind === "transaction" &&
                row.transaction.commentCount > 0 &&
                !row.transaction.conversationResolved
              }
              isFocused={isFocused}
              isSelected={isBill ? undefined : isSelected}
              selectionDisabled={isSelectionBusy}
              onSelectionClick={
                row.kind === "transaction"
                  ? (event) => handleSelectionClick(event, row.transaction.id)
                  : undefined
              }
              tabIndex={
                isFocused || (!focusedRowKey && virtualRow.index === 0) ? 0 : -1
              }
              data-testid={
                isBill ? "credit-card-bill-row" : "grouped-transaction-row"
              }
              onFocus={() => {
                setFocusedRowKey(row.key)
              }}
              onMouseEnter={() => setHoveredRowKey(row.key)}
              onMouseLeave={() => setHoveredRowKey(null)}
              onClick={(event) => handleRowClick(event, row)}
            >
              {row.kind === "transaction" ? (
                <TransactionCommentButton
                  transaction={row.transaction}
                  disabled={isSelectionBusy}
                />
              ) : (
                <div data-column="comment" aria-hidden="true" />
              )}
              {displayProperties.date ? (
                <div
                  data-column="date"
                  className="flex h-full min-w-0 items-center"
                >
                  <span className="sr-only">
                    {dateBasis === "monthly-review"
                      ? t("Date:")
                      : t("Flow date:")}
                  </span>
                  <span
                    data-field-value
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
                {row.kind === "bill" ? (
                  <TransactionMetadataGrid
                    layout={layout}
                    description={
                      <button
                        type="button"
                        disabled={isSelectionBusy}
                        tabIndex={-1}
                        data-list-open
                        data-testid="transaction-description"
                        title={t("{{value0}} bill", {
                          value0: row.bill.accountName
                        })}
                        className="min-w-12 shrink truncate text-left text-[13px]"
                      >
                        {row.bill.accountName} {t("bill")}
                      </button>
                    }
                    descriptionContext={
                      <span
                        title={
                          row.bill.matchingTransactionCount !== undefined &&
                          row.bill.matchingTransactionCount !==
                            row.bill.transactionCount
                            ? t("{{value0}} of {{value1}} transactions match", {
                                value0: row.bill.matchingTransactionCount,
                                value1: row.bill.transactionCount
                              })
                            : t("transactionsCount", {
                                count: row.bill.transactionCount
                              })
                        }
                        className="hidden min-w-0 max-w-32 shrink truncate text-xs text-foreground/45 lg:block"
                      >
                        {row.bill.matchingTransactionCount !== undefined &&
                        row.bill.matchingTransactionCount !==
                          row.bill.transactionCount
                          ? t("{{value0}} of {{value1}} transactions match", {
                              value0: row.bill.matchingTransactionCount,
                              value1: row.bill.transactionCount
                            })
                          : t("transactionsCount", {
                              count: row.bill.transactionCount
                            })}
                      </span>
                    }
                    icons={{
                      "card-icon": (
                        <CreditCardIndicator
                          billAccountName={row.bill.accountName}
                        />
                      )
                    }}
                    cells={{
                      account: (
                        <TransactionAccountChip
                          account={{
                            institutionId: row.bill.accountInstitutionId,
                            name: row.bill.accountName,
                            type: "credit"
                          }}
                        />
                      ),
                      status: status ? (
                        <FinaBadge
                          tone={status.tone}
                          className="max-w-full truncate border-0 px-1.5 py-0.5 text-[11px]"
                        >
                          {t(status.label)}
                        </FinaBadge>
                      ) : null
                    }}
                  />
                ) : (
                  <TransactionLedgerTransaction
                    transaction={row.transaction}
                    categories={categories}
                    layout={layout}
                    onUpdateTransaction={onUpdateTransaction}
                    disabled={isSelectionBusy}
                  />
                )}
              </div>
              {displayProperties.value ? (
                <div
                  data-column="value"
                  className="flex h-full w-[132px] items-center justify-end"
                >
                  <span className="sr-only">
                    {row.kind === "bill" && row.bill.matchingTotal !== undefined
                      ? dateBasis === "cash-flow" && row.bill.payment
                        ? t("Payment value:")
                        : t("Full bill value:")
                      : t("Value:")}
                  </span>
                  <span
                    data-field-value
                    title={
                      row.kind === "bill" &&
                      row.bill.matchingTotal !== undefined
                        ? t("{{value0}}; matching purchases: {{value1}}", {
                            value0:
                              dateBasis === "cash-flow" && row.bill.payment
                                ? t("Confirmed payment amount")
                                : t("Full bill amount"),
                            value1: currencyFormatter.format(
                              row.bill.matchingTotal
                            )
                          })
                        : undefined
                    }
                    className={cn(
                      "whitespace-nowrap text-[13px] tabular-nums",
                      row.value === 0
                        ? "text-foreground/45"
                        : row.value > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                    )}
                  >
                    {currencyFormatter.format(row.value)}
                  </span>
                </div>
              ) : null}
            </VirtualizedTransactionRow>
          )
        })}
      </VirtualizedTransactionList>

      {detailsNavigation.transaction ? (
        <TransactionDetailsModal {...detailsNavigation} />
      ) : null}

      {selectedTransactionIds.size > 0 ? (
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
