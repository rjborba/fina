import {
  FinaPage,
  FinaPageHeader,
  FinaSectionLabel
} from "@/components/FinaPage"
import { TransactionsSort } from "@/components/transactions/TransactionsSort"
import { FinancialInstitutionLogo } from "@/components/accounts/FinancialInstitutionLogo"
import {
  TransactionFilterPanel,
  type TransactionFilterValue
} from "@/components/transactions/TransactionsFilter"
import TransactionsList, {
  type TransactionsListProps
} from "@/components/transactions/TransactionsList"
import { useTransactionDisplayPreferences } from "@/components/transactions/useTransactionDisplayPreferences"
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { FinaBadge, FinaSurface } from "@/components/ui/fina"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCreditCardBillMutation } from "@/data/creditCardBills/useCreditCardBillMutation"
import { useCreditCardBill } from "@/data/creditCardBills/useCreditCardBills"
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation"
import { toast } from "@/hooks/use-toast"
import type { CreditCardBillStatus } from "@fina/types"
import { cardMetadataKey } from "@fina/types"
import dayjs from "dayjs"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Filter,
  Link2,
  ReceiptText,
  TriangleAlert,
  Unlink2
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import { BillCardsBreakdown } from "./BillCardsBreakdown"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
})

const statusDetails: Record<
  CreditCardBillStatus,
  {
    label: string
    tone: "lime" | "sky" | "yellow" | "danger"
    copy: string
  }
> = {
  empty: {
    label: "Empty",
    tone: "sky",
    copy: "This scheduled bill has no transactions, so no payment is required."
  },
  "needs-reconciliation": {
    label: "Needs reconciliation",
    tone: "yellow",
    copy: "Link the checking-account payment to confirm the cash-flow date and count the payment once."
  },
  reconciled: {
    label: "Reconciled",
    tone: "lime",
    copy: "Cash flow uses the confirmed payment date. The linked checking entry is excluded to count the payment once."
  },
  "needs-review": {
    label: "Needs review",
    tone: "danger",
    copy: "The bill changed after reconciliation. Review or unlink its payment."
  }
}

export function CreditCardBill() {
  const { accountId, billMonth } = useParams()
  const { selectedGroup } = useActiveGroup()
  const groupId = selectedGroup?.id?.toString()
  return (
    <CreditCardBillDetails
      key={`${groupId}:${accountId}:${billMonth}`}
      groupId={groupId}
      accountId={accountId}
      billMonth={billMonth}
    />
  )
}

function CreditCardBillDetails({
  groupId,
  accountId,
  billMonth
}: {
  groupId: string | undefined
  accountId: string | undefined
  billMonth: string | undefined
}) {
  const { data, isLoading, isError } = useCreditCardBill(
    groupId,
    accountId,
    billMonth
  )
  const { reconcileMutation, unlinkMutation } = useCreditCardBillMutation()
  const {
    updateMutation: { mutateAsync: updateTransaction },
    removeManyMutation: { mutateAsync: removeTransactions }
  } = useTransactionMutation()
  const { sort, setSort, displayProperties, setDisplayProperties } =
    useTransactionDisplayPreferences()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterResetKey, setFilterResetKey] = useState(0)
  const [filters, setFilters] = useState<TransactionFilterValue>({
    partialDescription: "",
    categoriesId: []
  })
  const hasFilters =
    filters.partialDescription.trim().length > 0 ||
    filters.categoriesId.length > 0 ||
    !!filters.cards?.length ||
    !!filters.importSource ||
    !!filters.importsId?.length ||
    filters.minValue !== undefined ||
    filters.maxValue !== undefined
  const filteredTransactions = useMemo(() => {
    const search = filters.partialDescription.trim().toLowerCase()
    const categoryIds = new Set(filters.categoriesId)
    const cardIds = new Set(filters.cards)
    const importIds = new Set(filters.importsId)
    return (data?.transactions ?? []).filter(
      (transaction) =>
        (!search ||
          (transaction.description ?? "").toLowerCase().includes(search)) &&
        (!categoryIds.size ||
          categoryIds.has(transaction.category?.id ?? "-1")) &&
        (!cardIds.size || cardIds.has(cardMetadataKey(transaction))) &&
        (!filters.importSource ||
          (filters.importSource === "imported"
            ? !!transaction.import
            : !transaction.import)) &&
        (!importIds.size ||
          (!!transaction.import && importIds.has(transaction.import.id))) &&
        (filters.minValue === undefined ||
          (transaction.value !== null &&
            transaction.value >= filters.minValue)) &&
        (filters.maxValue === undefined ||
          (transaction.value !== null && transaction.value <= filters.maxValue))
    )
  }, [data?.transactions, filters])
  const matchingTotal = filteredTransactions.reduce(
    (total, transaction) => total + (transaction.value ?? 0),
    0
  )
  const clearFilters = () => {
    setFilters({ partialDescription: "", categoriesId: [] })
    setFilterResetKey((current) => current + 1)
  }

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

  if (isLoading) {
    return (
      <FinaPage>
        <div className="p-8 font-mono text-xs font-semibold">
          Loading credit card bill...
        </div>
      </FinaPage>
    )
  }

  if (isError || !data || !groupId || !accountId || !billMonth) {
    return (
      <FinaPage>
        <div className="p-8">
          <FinaSurface tone="danger" className="p-6">
            <h1 className="text-2xl font-semibold">Bill not available</h1>
            <p className="mt-2 font-semibold">
              This bill does not exist or is not available in the active group.
            </p>
            <Button asChild variant="fina-secondary" className="mt-5">
              <Link to="/transactions">
                <ArrowLeft /> Back to transactions
              </Link>
            </Button>
          </FinaSurface>
        </div>
      </FinaPage>
    )
  }

  const { bill, candidates } = data
  const status = statusDetails[bill.status]
  const isMutating = reconcileMutation.isPending || unlinkMutation.isPending

  const reconcile = async (paymentTransactionId: string) => {
    try {
      await reconcileMutation.mutateAsync({
        groupId,
        accountId,
        billMonth,
        paymentTransactionId
      })
      toast({ title: "Credit card bill reconciled" })
    } catch {
      toast({
        title: "Could not reconcile this bill",
        variant: "destructive"
      })
    }
  }

  const unlink = async () => {
    try {
      await unlinkMutation.mutateAsync({ groupId, accountId, billMonth })
      toast({ title: "Bill payment unlinked" })
    } catch {
      toast({
        title: "Could not unlink this payment",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="flex min-h-svh min-w-0 bg-fina-canvas text-foreground">
      <div className="min-w-0 flex-1">
        <FinaPage>
          <FinaPageHeader
            eyebrow="Credit card bill"
            marker={dayjs(bill.dueDate).format("MM/YY")}
            title={`${bill.accountName} bill`}
            description={
              <div className="flex flex-wrap items-center gap-3">
                <FinancialInstitutionLogo
                  institutionId={bill.accountInstitutionId}
                  accountName={bill.accountName}
                  accountType="credit"
                  className="size-5"
                  decorative
                />
                <span>
                  Due {dayjs(bill.dueDate).format("DD MMMM YYYY")} ·{" "}
                  {bill.transactionCount} transactions
                </span>
                <FinaBadge tone={status.tone}>{status.label}</FinaBadge>
              </div>
            }
            actions={
              <Button asChild variant="fina-secondary" lift>
                <Link to="/transactions">
                  <ArrowLeft /> Back to transactions
                </Link>
              </Button>
            }
          />

          <main className="space-y-8 px-4 py-6 md:px-8 md:py-8">
            <section
              aria-label="Bill summary"
              className="grid overflow-hidden rounded-lg border border-fina-grid bg-fina-surface shadow-fina-sm sm:grid-cols-2 xl:grid-cols-4"
            >
              <div className="border-b border-r border-fina-grid p-5 xl:border-b-0">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground/50">
                  <FinancialInstitutionLogo
                    institutionId={bill.accountInstitutionId}
                    accountName={bill.accountName}
                    accountType="credit"
                    className="size-4"
                    decorative
                  />
                  Bill total
                </div>
                <div className="mt-4 font-mono text-3xl font-semibold tracking-[-0.06em]">
                  {currencyFormatter.format(bill.total)}
                </div>
              </div>
              <div className="border-b border-r border-fina-grid p-5 xl:border-b-0">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground/50">
                  <CalendarDays className="size-4 text-fina-violet" /> Due date
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-[-0.05em]">
                  {dayjs(bill.dueDate).format("DD MMM YYYY")}
                </div>
              </div>
              <div className="border-b border-r border-fina-grid p-5 xl:border-b-0">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground/50">
                  <ReceiptText className="size-4 text-fina-violet" /> Entries
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-[-0.06em]">
                  {bill.transactionCount}
                </div>
              </div>
              <div className="border-b border-fina-grid p-5 xl:border-b-0">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground/50">
                  {bill.status === "reconciled" || bill.status === "empty" ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <TriangleAlert className="size-4" />
                  )}
                  {bill.status === "empty" ? "Bill status" : "Reconciliation"}
                </div>
                <div className="mt-4 text-lg font-semibold tracking-[-0.04em]">
                  {status.label}
                </div>
              </div>
            </section>

            <section aria-labelledby="reconciliation-title">
              <div className="mb-4">
                <FinaSectionLabel>Payment / Reconciliation</FinaSectionLabel>
                <h2
                  id="reconciliation-title"
                  className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
                >
                  {bill.status === "empty"
                    ? "No payment required"
                    : "Match the bill payment"}
                </h2>
                <p className="mt-2 max-w-3xl text-sm font-semibold text-foreground/65">
                  {status.copy}
                  {bill.status === "empty"
                    ? null
                    : " Suggestions use the exact bill amount and a payment date within ten days of the due date."}
                </p>
              </div>

              {bill.status === "empty" ? (
                <FinaSurface tone="sky" className="p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Nothing to reconcile</p>
                      <p className="mt-1 text-sm font-semibold text-foreground/65">
                        This bill stays in the ledger on its due date with a
                        zero total.
                      </p>
                    </div>
                  </div>
                </FinaSurface>
              ) : bill.payment ? (
                <FinaSurface
                  tone={bill.status === "needs-review" ? "danger" : "lime"}
                  elevation="md"
                  className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center border border-fina-grid bg-fina-surface">
                      <Link2 className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-foreground/55">
                        Linked checking payment
                      </div>
                      <div className="mt-1 truncate text-lg font-semibold">
                        {bill.payment.description || "Untitled payment"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] font-bold uppercase">
                        <span className="inline-flex items-center gap-1.5">
                          <FinancialInstitutionLogo
                            institutionId={bill.payment.accountInstitutionId}
                            accountName={bill.payment.accountName}
                            accountType="checkout"
                            className="size-3.5"
                            decorative
                          />
                          {bill.payment.accountName}
                        </span>
                        <span>
                          {dayjs(bill.payment.date).format("DD MMM YYYY")}
                        </span>
                        <span>
                          {currencyFormatter.format(bill.payment.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ConfirmationDialog
                    trigger={
                      <Button
                        type="button"
                        variant="fina-danger"
                        disabled={isMutating}
                      >
                        <Unlink2 /> Unlink payment
                      </Button>
                    }
                    title="Unlink this bill payment?"
                    description="The checking transaction will return to both ledger views. Cash flow will schedule this bill on its due date until you reconcile it again."
                    confirmText="Unlink payment"
                    onConfirm={() => void unlink()}
                  />
                </FinaSurface>
              ) : candidates.length ? (
                <div className="grid gap-3">
                  {candidates.map((candidate) => (
                    <FinaSurface
                      key={candidate.transactionId}
                      elevation="sm"
                      className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center border border-fina-grid bg-fina-sky">
                          <FinancialInstitutionLogo
                            institutionId={candidate.accountInstitutionId}
                            accountName={candidate.accountName}
                            accountType="checkout"
                            className="size-7"
                            decorative
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {candidate.description || "Untitled payment"}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] font-bold uppercase text-foreground/60">
                            <span>{candidate.accountName}</span>
                            <span>
                              {dayjs(candidate.date).format("DD MMM YYYY")}
                            </span>
                            <span>
                              {currencyFormatter.format(candidate.value)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ConfirmationDialog
                        trigger={
                          <Button
                            type="button"
                            variant="fina-primary"
                            disabled={isMutating}
                          >
                            <Link2 /> Reconcile
                          </Button>
                        }
                        title="Reconcile this payment?"
                        description="Cash flow will use this payment’s date. Its checking entry is excluded from both ledger views to count the payment once."
                        confirmText="Reconcile payment"
                        onConfirm={() =>
                          void reconcile(candidate.transactionId)
                        }
                      />
                    </FinaSurface>
                  ))}
                </div>
              ) : (
                <FinaSurface tone="yellow" className="p-5">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="font-semibold">No matching payment</p>
                      <p className="mt-1 text-sm font-semibold text-foreground/65">
                        Add or correct the checking-account transaction, then
                        return here to reconcile it.
                      </p>
                    </div>
                  </div>
                </FinaSurface>
              )}
            </section>

            <section aria-labelledby="bill-transactions-title">
              <BillCardsBreakdown
                summaries={data.cardSummaries ?? []}
                roundingAdjustment={data.cardRoundingAdjustment ?? 0}
                selectedIds={filters.cards ?? []}
                onToggleCard={(id) =>
                  setFilters((current) => ({
                    ...current,
                    cards: current.cards?.includes(id)
                      ? current.cards.filter((selected) => selected !== id)
                      : [...(current.cards ?? []), id]
                  }))
                }
              />
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <FinaSectionLabel>Bill / Transactions</FinaSectionLabel>
                  <h2
                    id="bill-transactions-title"
                    className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
                  >
                    Purchases in this bill
                  </h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <TransactionsSort
                    value={sort}
                    onValueChange={setSort}
                    displayProperties={displayProperties}
                    onDisplayPropertiesChange={setDisplayProperties}
                  />
                  <Button
                    variant="fina-secondary"
                    lift
                    aria-expanded={isFilterOpen}
                    onClick={() => setIsFilterOpen((open) => !open)}
                  >
                    <Filter className="size-4" /> Filter
                  </Button>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p
                  className="font-mono text-xs font-semibold tracking-[0.08em]"
                  aria-live="polite"
                >
                  {filteredTransactions.length} of {bill.transactionCount}{" "}
                  purchases
                </p>
                {hasFilters ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <FinaBadge tone="sky" aria-label="Matching purchases total">
                      Matching purchases total:{" "}
                      {currencyFormatter.format(matchingTotal)}
                    </FinaBadge>
                    <Button variant="fina-ghost" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </div>
                ) : null}
              </div>
              {hasFilters &&
              !filteredTransactions.length &&
              bill.transactionCount > 0 ? (
                <FinaSurface className="p-8 text-center">
                  <p className="font-semibold">
                    No purchases match these filters
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground/65">
                    Adjust or clear the filters to see purchases in this bill.
                  </p>
                </FinaSurface>
              ) : (
                <TransactionsList
                  data={filteredTransactions}
                  totalCount={filteredTransactions.length}
                  sort={sort}
                  displayProperties={displayProperties}
                  dateBasis="purchase-date"
                  isLoading={false}
                  isError={false}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransactions={handleDeleteTransactions}
                />
              )}
            </section>
          </main>
        </FinaPage>
      </div>
      <TransactionFilterPanel
        key={filterResetKey}
        value={filters}
        onChange={setFilters}
        isOpen={isFilterOpen}
        onFilterToggle={setIsFilterOpen}
        allowAccounts={false}
        cardAccountId={accountId}
      />
    </div>
  )
}
