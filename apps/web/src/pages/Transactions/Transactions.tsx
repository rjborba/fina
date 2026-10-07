import { TransactionsFilter } from "@/components/transactions/TransactionsFilter"
import { TransactionsHeader } from "@/components/transactions/TransactionsHeader"
import { TransactionsSort } from "@/components/transactions/TransactionsSort"
import { CreditCardBillsLedger } from "@/components/transactions/CreditCardBillsLedger"
import type { TransactionsTableProps } from "@/components/transactions/TransactionsTable"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import {
  DEFAULT_TRANSACTION_SORT,
  type TransactionSortOption
} from "@/components/transactions/transactionSort"
import { Button } from "@/components/ui/button"
import { FinaBadge, FinaSurface } from "@/components/ui/fina"
import { Switch } from "@/components/ui/switch"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCategories } from "@/data/categories/useCategories"
import { useCreditCardBills } from "@/data/creditCardBills/useCreditCardBills"
import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import { useTransactions } from "@/data/transactions/useTransactions"
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation"
import useLocalStorageState from "@/hooks/useLocalStorageState"
import { cn } from "@/lib/utils"
import { useAtom } from "jotai"
import dayjs from "dayjs"
import {
  ArrowDownRight,
  ArrowUpRight,
  ReceiptText,
  Sigma,
  TriangleAlert,
  X
} from "lucide-react"
import {
  FC,
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

const TransactionsTable = lazy(() =>
  import("@/components/transactions/TransactionsTable").then((module) => ({
    default: module.default as FC<TransactionsTableProps>
  }))
)

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
})

const formatCurrency = (value: number) => currencyFormatter.format(value)

const EMPTY_TRANSACTIONS: TransactionOutput[] = []

const creditCardBillKey = (accountId: string, billMonth: string) =>
  `${accountId}:${billMonth}`

const transactionBillKey = (transaction: TransactionOutput) => {
  if (transaction.bankaccount?.type !== "credit") return null

  const billDate =
    transaction.creditDueDate ||
    transaction.toBeConsideredAt ||
    transaction.calculatedDate

  return billDate
    ? creditCardBillKey(transaction.bankaccount.id, billDate.slice(0, 7))
    : null
}

export const Transactions: FC = () => {
  const [searchParams] = useSearchParams()
  const linkedAccountId = searchParams.get("accountId")
  const {
    updateMutation: { mutateAsync: updateTransaction },
    removeManyMutation: { mutateAsync: removeTransactions }
  } = useTransactionMutation()

  const handleUpdateTransaction = useCallback<
    TransactionsTableProps["onUpdateTransaction"]
  >(
    async (id, transaction) => {
      await updateTransaction({ id, transaction })
    },
    [updateTransaction]
  )

  const handleDeleteTransactions = useCallback<
    TransactionsTableProps["onDeleteTransactions"]
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
  const [sort, setSort] = useState<TransactionSortOption>(
    DEFAULT_TRANSACTION_SORT
  )
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

  const {
    data: transactionsData,
    isLoading,
    isError
  } = useTransactions({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    groupId: selectedGroup?.id?.toString() || "-1",
    startDate: filterProps.startDate,
    endDate: filterProps.endDate,
    dateBasis,
    search: filterProps.partialDescription || undefined,
    categoryIdList: filterProps.categoriesId,
    accountIdList: linkedAccountId ? [linkedAccountId] : undefined
  })

  const billQuery = useMemo<CreditCardBillListQuery>(
    () => ({
      groupId: selectedGroup?.id?.toString() || "-1",
      startDate: filterProps.startDate,
      endDate: filterProps.endDate,
      dateBasis
    }),
    [filterProps.endDate, filterProps.startDate, selectedGroup?.id, dateBasis]
  )
  const {
    data: creditCardBills = [],
    isLoading: areBillsLoading,
    isError: areBillsError
  } = useCreditCardBills(billQuery, !inlineCreditCardTransactions)

  const { data: categories } = useCategories({
    groupId: selectedGroup?.id?.toString() || ""
  })

  const [isFilterOpen, setIsFilterOpen] = useLocalStorageState<boolean>(
    "transactionsFilterOpen",
    false
  )

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

  const hasTransactionFilter =
    filterProps.partialDescription.trim().length > 0 ||
    filterProps.categoriesId.length > 0

  const matchingCreditCardBillKeys = useMemo(
    () =>
      new Set(
        (transactionsData?.data || []).flatMap((transaction) => {
          const key = transactionBillKey(transaction)
          return key ? [key] : []
        })
      ),
    [transactionsData?.data]
  )

  const visibleCreditCardBills = useMemo(
    () =>
      creditCardBills.filter((bill) => {
        if (linkedAccountId && bill.accountId !== linkedAccountId) return false
        if (!hasTransactionFilter) return true

        return matchingCreditCardBillKeys.has(
          creditCardBillKey(bill.accountId, bill.billMonth)
        )
      }),
    [
      creditCardBills,
      hasTransactionFilter,
      linkedAccountId,
      matchingCreditCardBillKeys
    ]
  )

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
      (transactionsData?.data || []).filter(
        (transaction) =>
          transaction.bankaccount?.type !== "credit" &&
          !transaction.billPayment &&
          !linkedPaymentIds.has(transaction.id)
      ),
    [linkedPaymentIds, transactionsData?.data]
  )
  const inlineLedgerTransactions = useMemo(
    () =>
      (transactionsData?.data || EMPTY_TRANSACTIONS).filter(
        (transaction) => !transaction.billPayment
      ),
    [transactionsData?.data]
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
        ? bill.total
        : (bill.payment?.value ?? bill.total)
      sum.total += value
      if (value > 0) sum.income += value
      if (value < 0) sum.expense += value
    }
  }

  for (const transaction of transactionsData?.data || []) {
    if (transaction.billPayment) continue
    if (!transaction.value || !transaction.category?.id) continue

    sumCategories[transaction.category.id] =
      (sumCategories[transaction.category.id] || 0) + transaction.value
  }

  return (
    <div className="flex min-h-svh min-w-0 bg-fina-grid text-fina-ink">
      <div className="min-w-0 flex-1">
        <TransactionsHeader
          isFilterOpen={isFilterOpen}
          onFilterToggle={(isOpen) => {
            setIsFilterOpen(isOpen)
            if (isOpen) {
              setIsDrawerOpen(false)
            }
          }}
          totalCount={visibleEntryCount}
          monthlyReview={monthlyReview}
        />

        <section className="px-4 py-4 md:px-8 md:py-5">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em]">
                Ledger / {monthlyReview ? "Monthly review" : "Cash flow"}
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em] md:text-3xl">
                {monthlyReview ? "Review together" : "Activity log"}
              </h2>
              <p className="mt-2 max-w-xl text-sm font-semibold text-fina-ink/65">
                {monthlyReview
                  ? "Organize expenses by their reference month, including whole card bills. Linked card payments are excluded."
                  : "Paid card bills appear on their confirmed payment dates. Unpaid bills are scheduled on their due dates. Each linked payment is counted once."}
              </p>
            </div>
            <div className="flex flex-wrap items-stretch justify-end gap-3">
              <div
                role="group"
                aria-label="Ledger view"
                className="flex border-2 border-fina-ink bg-fina-surface shadow-fina-sm"
              >
                {(["monthly-review", "cash-flow"] as const).map((view) => (
                  <Button
                    key={view}
                    variant="fina-ghost"
                    aria-pressed={dateBasis === view}
                    className={cn(
                      "h-10 px-3",
                      dateBasis === view && "bg-fina-lime"
                    )}
                    onClick={() => {
                      setDateBasis(view)
                      if (view === "monthly-review")
                        setFilterProps((current) => ({
                          ...current,
                          startDate: dayjs(current.startDate)
                            .startOf("month")
                            .toDate(),
                          endDate: dayjs(current.startDate)
                            .endOf("month")
                            .toDate()
                        }))
                    }}
                  >
                    {view === "monthly-review" ? "Monthly review" : "Cash flow"}
                  </Button>
                ))}
              </div>
              {monthlyReview ? (
                <label
                  htmlFor="inline-credit-card-transactions"
                  className="flex h-11 cursor-pointer items-center gap-3 border-2 border-fina-ink bg-fina-surface px-3 shadow-fina-sm"
                >
                  <Switch
                    id="inline-credit-card-transactions"
                    checked={inlineCreditCardTransactions}
                    onCheckedChange={setInlineCreditCardTransactions}
                    className="rounded-none border-2 border-fina-ink bg-fina-canvas data-[state=checked]:bg-fina-lime data-[state=unchecked]:bg-fina-surface"
                  />
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.1em]">
                    Inline credit card transactions
                  </span>
                </label>
              ) : null}
              <TransactionsSort value={sort} onValueChange={setSort} />
            </div>
          </div>

          {hasBillsNeedingAttention ? (
            <div
              role="status"
              className="mb-3 flex items-start gap-3 border-2 border-fina-ink bg-fina-yellow p-3 font-mono text-[10px] font-black uppercase tracking-[0.08em] shadow-fina-sm"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              Some bills need reconciliation or review. Linked payments are
              counted once; an unlinked checking payment may still duplicate a
              bill.
            </div>
          ) : null}

          <Suspense
            fallback={
              <FinaSurface
                elevation="lg"
                className="p-10 text-center font-mono text-xs font-black uppercase"
              >
                Loading the ledger...
              </FinaSurface>
            }
          >
            {inlineCreditCardTransactions ? (
              <TransactionsTable
                data={inlineLedgerTransactions}
                isLoading={isLoading}
                isError={isError}
                totalCount={visibleEntryCount}
                pageIndex={pagination.pageIndex}
                pageSize={pagination.pageSize}
                sort={sort}
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
                dateBasis={dateBasis}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransactions={handleDeleteTransactions}
              />
            )}
          </Suspense>

          {linkedAccountId && (
            <FinaBadge tone="yellow" className="mt-4 shadow-fina-sm">
              Account filter is active
            </FinaBadge>
          )}
        </section>

        <Button
          variant="fina-primary"
          onClick={() => {
            setIsFilterOpen(false)
            setIsDrawerOpen(true)
          }}
          aria-expanded={isDrawerOpen}
          aria-controls="transactions-summary-panel"
          className="fixed right-0 top-1/2 z-30 h-auto -translate-y-1/2 flex-col border-r-0 px-2 py-4 shadow-[-4px_4px_0_var(--fina-ink)] hover:-translate-y-1/2 hover:bg-fina-surface hover:shadow-[-4px_4px_0_var(--fina-ink)] active:-translate-y-1/2"
        >
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] [writing-mode:vertical-rl]">
            Totals
          </span>
          <Sigma className="mt-2 size-4" />
        </Button>

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
            "fixed inset-y-0 right-0 z-[70] flex w-[min(440px,calc(100vw-16px))] flex-col border-l-[3px] border-fina-ink bg-fina-canvas text-fina-ink shadow-[-10px_0_0_var(--fina-ink)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isDrawerOpen
              ? "pointer-events-auto translate-x-0"
              : "pointer-events-none translate-x-[calc(100%+10px)]"
          )}
        >
          <div className="flex h-20 shrink-0 items-center justify-between border-b-2 border-fina-ink bg-fina-lime px-5">
            <div>
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em]">
                Statement / totals
              </p>
              <h2 className="text-2xl font-black uppercase tracking-[-0.06em]">
                Period summary
              </h2>
            </div>
            <Button
              ref={closeDrawerButtonRef}
              variant="ghost"
              size="icon"
              tabIndex={isDrawerOpen ? 0 : -1}
              aria-label="Close totals panel"
              onClick={() => setIsDrawerOpen(false)}
              className="size-10 rounded-none border-2 border-fina-ink bg-fina-surface text-fina-ink shadow-fina-sm hover:bg-fina-ink hover:text-white"
            >
              <X className="size-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 border-b-2 border-fina-ink">
              <div className="border-b-2 border-r-2 border-fina-ink bg-fina-ink p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/65">
                    {monthlyReview ? "Review balance" : "Net flow"}
                  </span>
                  <Sigma className="size-5 text-fina-lime" />
                </div>
                <p className="mt-5 text-xl font-black tracking-[-0.05em] sm:text-2xl">
                  {formatCurrency(sum.total)}
                </p>
              </div>
              <div className="border-b-2 border-fina-ink bg-fina-lime p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em]">
                    Incoming
                  </span>
                  <ArrowUpRight className="size-5" />
                </div>
                <p className="mt-5 text-xl font-black tracking-[-0.05em] sm:text-2xl">
                  {formatCurrency(sum.income)}
                </p>
              </div>
              <div className="border-r-2 border-fina-ink bg-fina-violet p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/75">
                    Outgoing
                  </span>
                  <ArrowDownRight className="size-5" />
                </div>
                <p className="mt-5 text-xl font-black tracking-[-0.05em] sm:text-2xl">
                  {formatCurrency(Math.abs(sum.expense))}
                </p>
              </div>
              <div className="bg-fina-sky p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em]">
                    Entries
                  </span>
                  <ReceiptText className="size-5" />
                </div>
                <p className="mt-5 text-xl font-black tracking-[-0.05em] sm:text-2xl">
                  {visibleEntryCount.toLocaleString("en-US")}
                </p>
              </div>
            </div>

            <div className="border-b-2 border-fina-ink bg-fina-yellow px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
                  {monthlyReview ? "Category breakdown" : "Purchase categories"}
                </p>
                <span className="font-mono text-[9px] font-black uppercase">
                  {categories?.length || 0} categories
                </span>
              </div>
              {!monthlyReview ? (
                <p className="mt-2 text-xs font-semibold text-fina-ink/65">
                  Categories describe the underlying purchases. If a paid bill
                  changes, its purchase amounts can differ from the confirmed
                  cash payment.
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 bg-fina-surface">
              {categories?.map((category) => (
                <div
                  key={category.id}
                  className="border-b border-r border-fina-ink p-4"
                >
                  <div className="flex items-center gap-2">
                    <CategoryAppearance
                      icon={category.icon}
                      color={category.color}
                      className="size-7 border"
                    />
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                      {category.name}
                    </p>
                  </div>
                  <p className="mt-2 text-lg font-black tracking-[-0.04em]">
                    {formatCurrency(sumCategories[category.id] || 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <TransactionsFilter
        isOpen={isFilterOpen}
        onFilterToggle={(isOpen) => {
          setIsFilterOpen(isOpen)
          if (isOpen) {
            setIsDrawerOpen(false)
          }
        }}
      />
    </div>
  )
}
