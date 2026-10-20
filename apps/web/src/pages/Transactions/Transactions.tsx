import {
  TransactionFilterChips,
  TransactionsFilter,
  type TransactionFilterValue
} from "@/components/transactions/TransactionsFilter"
import { TransactionsHeader } from "@/components/transactions/TransactionsHeader"
import { TransactionsSort } from "@/components/transactions/TransactionsSort"
import { TransactionsDateFilter } from "@/components/transactions/TransactionsDateFilter"
import { TransactionsSearch } from "@/components/transactions/TransactionsSearch"
import { TransactionShortcuts } from "@/components/transactions/TransactionShortcuts"
import { TransactionFilterProvider } from "@/components/transactions/TransactionFilterProvider"
import { CreditCardBillsLedger } from "@/components/transactions/CreditCardBillsLedger"
import type { TransactionsListProps } from "@/components/transactions/TransactionsList"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import { useTransactionDisplayPreferences } from "@/components/transactions/useTransactionDisplayPreferences"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCategories } from "@/data/categories/useCategories"
import { useCreditCardBills } from "@/data/creditCardBills/useCreditCardBills"
import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import { transactionFiltersStorageKey } from "@/data/transactions/transactionFilterStorage"
import {
  reviewMonthFromDate,
  reviewMonthStart,
  reviewMonthEnd
} from "@/data/transactions/reviewMonthSelection"
import { useTransactions } from "@/data/transactions/useTransactions"
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation"
import useLocalStorageState from "@/hooks/useLocalStorageState"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { useAtom } from "jotai"
import {
  ArrowDownRight,
  ArrowUpRight,
  ReceiptText,
  Keyboard,
  Sigma,
  TriangleAlert,
  X
} from "lucide-react"
import {
  FC,
  type Dispatch,
  type SetStateAction,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { useSearchParams } from "react-router"
import type { CreditCardBillListQuery, TransactionOutput } from "@fina/types"

const TransactionsList = lazy(() =>
  import("@/components/transactions/TransactionsList").then((module) => ({
    default: module.default as FC<TransactionsListProps>
  }))
)

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
})

const formatCurrency = (value: number) => currencyFormatter.format(value)

const EMPTY_TRANSACTIONS: TransactionOutput[] = []

export const Transactions: FC = () => {
  const { user } = useAuth()
  const { selectedGroup } = useActiveGroup()

  if (!user || !selectedGroup) {
    return (
      <div
        role="status"
        className="flex h-svh items-center justify-center bg-fina-surface text-xs text-muted-foreground dark:bg-fina-canvas"
      >
        Loading the ledger...
      </div>
    )
  }

  const storageKey = transactionFiltersStorageKey(user.id, selectedGroup.id)
  return (
    <TransactionFilterProvider key={storageKey} storageKey={storageKey}>
      <TransactionsView />
    </TransactionFilterProvider>
  )
}

const TransactionsView: FC = () => {
  const [searchParams] = useSearchParams()
  const linkedAccountId = searchParams.get("accountId")
  const {
    updateMutation: { mutateAsync: updateTransaction },
    removeManyMutation: { mutateAsync: removeTransactions }
  } = useTransactionMutation()

  const handleUpdateTransaction = useCallback<
    TransactionsListProps["onUpdateTransaction"]
  >(
    async (id, transaction) => {
      await updateTransaction({ id, transaction })
    },
    [updateTransaction]
  )

  const handleDeleteTransactions = useCallback<
    TransactionsListProps["onDeleteTransactions"]
  >(
    async (ids) => {
      await removeTransactions(ids)
    },
    [removeTransactions]
  )

  const { selectedGroup } = useActiveGroup()

  const [pagination] = useState({
    pageIndex: 0,
    pageSize: 4000
  })
  const { sort, setSort, displayProperties, setDisplayProperties } =
    useTransactionDisplayPreferences()
  const [inlineCreditCardPreference, setInlineCreditCardTransactions] =
    useLocalStorageState<boolean>("inlineCreditCardTransactions", true)
  const [storedDateBasis, setDateBasis] = useLocalStorageState<string>(
    "ledgerDateBasis:v1",
    "cash-flow"
  )
  const dateBasis =
    storedDateBasis === "monthly-review" ? "monthly-review" : "cash-flow"
  const monthlyReview = dateBasis === "monthly-review"
  const inlineCreditCardTransactions =
    monthlyReview && inlineCreditCardPreference

  const [filterProps, setFilterProps] = useAtom(transactionFilterAtom)
  const changeFilter = useCallback<
    Dispatch<SetStateAction<TransactionFilterValue>>
  >(
    (update) => {
      setFilterProps((current) => {
        const next = typeof update === "function" ? update(current) : update
        return {
          ...current,
          ...next,
          startDate: next.startDate ?? current.startDate,
          endDate: next.endDate ?? current.endDate
        }
      })
    },
    [setFilterProps]
  )
  const selectedAccountIds = filterProps.accountsId
  const accountFiltersConflict = !!(
    linkedAccountId &&
    selectedAccountIds?.length &&
    !selectedAccountIds.includes(linkedAccountId)
  )
  const purchaseFilters = useMemo(
    () => ({
      search: filterProps.partialDescription || undefined,
      categoryIdList: filterProps.categoriesId,
      cardList: filterProps.cards?.length ? filterProps.cards : undefined,
      accountIdList: linkedAccountId
        ? [linkedAccountId]
        : selectedAccountIds?.length
          ? selectedAccountIds
          : undefined,
      importSource: filterProps.importSource,
      importIdList: filterProps.importsId?.length
        ? filterProps.importsId
        : undefined,
      minValue: filterProps.minValue,
      maxValue: filterProps.maxValue
    }),
    [
      filterProps.partialDescription,
      filterProps.categoriesId,
      filterProps.cards,
      selectedAccountIds,
      filterProps.importSource,
      filterProps.importsId,
      filterProps.minValue,
      filterProps.maxValue,
      linkedAccountId
    ]
  )
  const queryDates = useMemo(
    () => ({
      startDate: monthlyReview
        ? reviewMonthStart(reviewMonthFromDate(filterProps.startDate))
        : filterProps.startDate,
      endDate: monthlyReview
        ? reviewMonthEnd(reviewMonthFromDate(filterProps.endDate))
        : filterProps.endDate
    }),
    [filterProps.startDate, filterProps.endDate, monthlyReview]
  )

  const {
    data: transactionsData,
    isLoading,
    isError
  } = useTransactions(
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      groupId: selectedGroup?.id?.toString() || "-1",
      ...queryDates,
      ...purchaseFilters,
      dateBasis,
      reviewMonths: monthlyReview ? filterProps.reviewMonths : undefined
    },
    !accountFiltersConflict
  )

  const billQuery = useMemo<CreditCardBillListQuery>(
    () => ({
      groupId: selectedGroup?.id?.toString() || "-1",
      ...queryDates,
      ...purchaseFilters,
      dateBasis,
      reviewMonths: monthlyReview ? filterProps.reviewMonths : undefined
    }),
    [
      queryDates,
      purchaseFilters,
      filterProps.reviewMonths,
      selectedGroup?.id,
      dateBasis,
      monthlyReview
    ]
  )
  const {
    data: creditCardBills = [],
    isLoading: areBillsLoading,
    isError: areBillsError
  } = useCreditCardBills(
    billQuery,
    !inlineCreditCardTransactions && !accountFiltersConflict
  )

  const { data: categories } = useCategories({
    groupId: selectedGroup?.id?.toString() || ""
  })

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchFocusRequest, setSearchFocusRequest] = useState(0)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="textbox"]'
        )
      )
        return
      if (
        document.querySelector(
          '[role="dialog"]:not([aria-hidden="true"]), [role="alertdialog"]:not([aria-hidden="true"]), [role="menu"], [role="listbox"]'
        )
      )
        return
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === "f") {
        event.preventDefault()
        setIsSearchOpen(true)
        setSearchFocusRequest((request) => request + 1)
      } else if (!event.metaKey && !event.ctrlKey) {
        if (key === "f" && !event.shiftKey) {
          event.preventDefault()
          setIsFilterOpen(true)
        } else if (key === "v" && event.shiftKey) {
          event.preventDefault()
          setIsDisplayOpen(true)
        } else if (event.key === "?") {
          event.preventDefault()
          setIsShortcutsOpen(true)
        }
      }
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  const [isDrawerOpen, setIsDrawerOpen] = useLocalStorageState<boolean>(
    "transactionsDrawerOpen",
    false
  )
  const drawerRef = useRef<HTMLElement>(null)
  const closeDrawerButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    drawerRef.current?.toggleAttribute("inert", !isDrawerOpen)

    if (!isDrawerOpen) {
      return
    }

    closeDrawerButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDrawerOpen, setIsDrawerOpen])

  const visibleCreditCardBills = useMemo(
    () =>
      accountFiltersConflict
        ? []
        : creditCardBills.filter(
            (bill) =>
              !purchaseFilters.accountIdList?.length ||
              purchaseFilters.accountIdList.includes(bill.accountId)
          ),
    [creditCardBills, accountFiltersConflict, purchaseFilters.accountIdList]
  )
  const visibleTransactions = accountFiltersConflict
    ? EMPTY_TRANSACTIONS
    : (transactionsData?.data ?? EMPTY_TRANSACTIONS)

  const linkedPaymentIds = useMemo(
    () =>
      new Set(
        visibleCreditCardBills.flatMap((bill) =>
          bill.payment ? [bill.payment.transactionId] : []
        )
      ),
    [visibleCreditCardBills]
  )
  const visibleCheckoutTransactions = useMemo(
    () =>
      visibleTransactions.filter(
        (transaction) =>
          transaction.bankaccount?.type !== "credit" &&
          !transaction.billPayment &&
          !linkedPaymentIds.has(transaction.id)
      ),
    [linkedPaymentIds, visibleTransactions]
  )
  const inlineLedgerTransactions = useMemo(
    () => visibleTransactions.filter((transaction) => !transaction.billPayment),
    [visibleTransactions]
  )
  const visibleEntryCount = inlineCreditCardTransactions
    ? inlineLedgerTransactions.length
    : visibleCheckoutTransactions.length + visibleCreditCardBills.length
  const hasBillsNeedingAttention =
    !inlineCreditCardTransactions &&
    visibleCreditCardBills.some(
      (bill) =>
        bill.status === "needs-reconciliation" || bill.status === "needs-review"
    )

  const sum = {
    total: 0,
    income: 0,
    expense: 0
  }

  const sumCategories: Record<string, number> = {}

  const transactionsForTotals = inlineCreditCardTransactions
    ? inlineLedgerTransactions
    : visibleCheckoutTransactions

  for (const transaction of transactionsForTotals) {
    if (!transaction.value) {
      continue
    }

    sum.total += transaction.value
    if (transaction.value > 0) {
      sum.income += transaction.value
    } else {
      sum.expense += transaction.value
    }
  }

  if (!inlineCreditCardTransactions) {
    for (const bill of visibleCreditCardBills) {
      const value = monthlyReview
        ? (bill.matchingTotal ?? bill.total)
        : (bill.payment?.value ?? bill.total)
      sum.total += value
      if (value > 0) sum.income += value
      if (value < 0) sum.expense += value
    }
  }

  for (const transaction of visibleTransactions) {
    if (transaction.billPayment) continue
    if (!transaction.value || !transaction.category?.id) continue

    sumCategories[transaction.category.id] =
      (sumCategories[transaction.category.id] || 0) + transaction.value
  }

  return (
    <div className="flex h-svh min-w-0 flex-col bg-fina-surface text-foreground dark:bg-fina-canvas">
      <TransactionsHeader totalCount={visibleEntryCount}>
        <div
          role="toolbar"
          aria-label="Transaction view controls"
          className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-fina-grid px-4 py-1.5 md:px-6"
        >
          <div className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1">
            <div
              role="group"
              aria-label="Ledger view"
              className="flex items-center gap-0.5"
            >
              {(["monthly-review", "cash-flow"] as const).map((view) => (
                <Button
                  key={view}
                  variant="fina-ghost"
                  aria-pressed={dateBasis === view}
                  className={cn(
                    "h-7 px-2 text-xs font-normal",
                    dateBasis === view
                      ? "bg-fina-canvas text-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={() => {
                    setDateBasis(view)
                    if (view === "monthly-review")
                      setFilterProps((current) => ({
                        ...current,
                        startDate: reviewMonthStart(
                          reviewMonthFromDate(current.startDate)
                        ),
                        endDate: reviewMonthEnd(
                          reviewMonthFromDate(current.endDate)
                        )
                      }))
                  }}
                >
                  {view === "monthly-review" ? "Monthly review" : "Cash flow"}
                </Button>
              ))}
            </div>
            <TransactionsFilter
              presentation="popover"
              isOpen={isFilterOpen}
              onFilterToggle={setIsFilterOpen}
              dateBasis={dateBasis}
            />
            <TransactionFilterChips
              value={filterProps}
              onChange={changeFilter}
              dateBasis={dateBasis}
              linkedAccountId={linkedAccountId}
            />
            {linkedAccountId ? (
              <span className="text-[11px] text-muted-foreground">
                Account filter
              </span>
            ) : null}
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-1">
            <TransactionsDateFilter monthlyReview={monthlyReview} />
            <TransactionsSearch
              open={isSearchOpen}
              onOpenChange={setIsSearchOpen}
              focusRequest={searchFocusRequest}
            />
            <TransactionsSort
              value={sort}
              onValueChange={setSort}
              open={isDisplayOpen}
              onOpenChange={setIsDisplayOpen}
              displayProperties={displayProperties}
              onDisplayPropertiesChange={setDisplayProperties}
              inlineCreditCardTransactions={inlineCreditCardTransactions}
              onInlineCreditCardTransactionsChange={
                monthlyReview ? setInlineCreditCardTransactions : undefined
              }
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Period totals"
              aria-expanded={isDrawerOpen}
              aria-controls="transactions-summary-panel"
              className="size-7 text-muted-foreground"
              title="Period totals"
            >
              <Sigma className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              onClick={() => setIsShortcutsOpen(true)}
              className="size-7 text-muted-foreground"
            >
              <Keyboard className="size-3.5" />
            </Button>
            {hasBillsNeedingAttention ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="status"
                    aria-label="Some bills need reconciliation or review"
                    className="flex size-7 items-center justify-center text-amber-600 dark:text-amber-400"
                  >
                    <TriangleAlert className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Some bills need reconciliation or review. Unlinked payments
                  may duplicate a bill.
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </TransactionsHeader>
      <section
        aria-label="Transaction ledger"
        className="flex min-h-0 flex-1 flex-col pt-2"
      >
        <Suspense
          fallback={
            <div className="px-6 py-8 text-xs text-muted-foreground">
              Loading the ledger...
            </div>
          }
        >
          {inlineCreditCardTransactions ? (
            <TransactionsList
              fillAvailableSpace
              data={inlineLedgerTransactions}
              isLoading={isLoading}
              isError={isError}
              totalCount={visibleEntryCount}
              sort={sort}
              displayProperties={displayProperties}
              dateBasis={dateBasis}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransactions={handleDeleteTransactions}
            />
          ) : (
            <CreditCardBillsLedger
              transactions={visibleCheckoutTransactions}
              bills={visibleCreditCardBills}
              isLoading={isLoading || areBillsLoading}
              isError={isError || areBillsError}
              sort={sort}
              displayProperties={displayProperties}
              dateBasis={dateBasis}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransactions={handleDeleteTransactions}
            />
          )}
        </Suspense>
      </section>

      <button
        type="button"
        aria-label="Close totals panel"
        aria-hidden={!isDrawerOpen}
        tabIndex={isDrawerOpen ? 0 : -1}
        onClick={() => setIsDrawerOpen(false)}
        className={cn(
          "fixed inset-0 z-[60] cursor-default bg-fina-ink/60 transition-opacity duration-300 ease-out",
          isDrawerOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      />
      <aside
        ref={drawerRef}
        id="transactions-summary-panel"
        role="dialog"
        aria-modal="true"
        aria-hidden={!isDrawerOpen}
        aria-label="Period totals"
        className={cn(
          "fixed inset-y-0 right-0 z-[70] flex w-[min(440px,calc(100vw-16px))] flex-col border-l border-fina-grid bg-fina-canvas text-foreground shadow-fina-lg transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isDrawerOpen
            ? "pointer-events-auto translate-x-0"
            : "pointer-events-none translate-x-[calc(100%+10px)]"
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-fina-grid bg-fina-surface px-5">
          <div>
            <h2 className="text-sm font-medium">Period summary</h2>
          </div>
          <Button
            ref={closeDrawerButtonRef}
            variant="ghost"
            size="icon"
            tabIndex={isDrawerOpen ? 0 : -1}
            aria-label="Close totals panel"
            onClick={() => setIsDrawerOpen(false)}
            className="size-9 rounded-md border border-fina-grid bg-fina-surface text-foreground shadow-none hover:bg-fina-canvas"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 border-b border-fina-grid bg-fina-surface">
            <div className="border-b border-r border-fina-grid p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-medium text-foreground/50">
                  {monthlyReview ? "Review balance" : "Net flow"}
                </span>
                <Sigma className="size-4 text-fina-violet" />
              </div>
              <p className="mt-3 text-lg font-medium tabular-nums">
                {formatCurrency(sum.total)}
              </p>
            </div>
            <div className="border-b border-fina-grid p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-medium text-foreground/50">
                  Incoming
                </span>
                <ArrowUpRight className="size-4 text-emerald-600" />
              </div>
              <p className="mt-3 text-lg font-medium tabular-nums">
                {formatCurrency(sum.income)}
              </p>
            </div>
            <div className="border-r border-fina-grid p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-medium text-foreground/50">
                  Outgoing
                </span>
                <ArrowDownRight className="size-4 text-red-500" />
              </div>
              <p className="mt-3 text-lg font-medium tabular-nums">
                {formatCurrency(Math.abs(sum.expense))}
              </p>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-medium text-foreground/50">
                  Entries
                </span>
                <ReceiptText className="size-4 text-fina-violet" />
              </div>
              <p className="mt-3 text-lg font-medium tabular-nums">
                {visibleEntryCount.toLocaleString("en-US")}
              </p>
            </div>
          </div>

          <div className="border-b border-fina-grid bg-fina-canvas px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <p
                className="text-xs font-medium"
                title={
                  monthlyReview
                    ? undefined
                    : "Categories describe purchases; purchase totals can differ from confirmed bill payments."
                }
              >
                {monthlyReview ? "Category breakdown" : "Purchase categories"}
              </p>
              <span className="text-[11px] text-foreground/50">
                {categories?.length || 0} categories
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 bg-fina-surface">
            {categories?.map((category) => (
              <div
                key={category.id}
                className="border-b border-r border-fina-grid p-4"
              >
                <div className="flex items-center gap-2">
                  <CategoryAppearance color={category.color} />
                  <p className="truncate text-xs font-medium">
                    {category.name}
                  </p>
                </div>
                <p className="mt-2 text-sm font-medium tabular-nums">
                  {formatCurrency(sumCategories[category.id] || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <TransactionShortcuts
        open={isShortcutsOpen}
        onOpenChange={setIsShortcutsOpen}
      />
    </div>
  )
}
