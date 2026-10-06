import {
  FinaPage,
  FinaPageHeader,
  FinaSectionLabel
} from "@/components/FinaPage"
import { TransactionsSort } from "@/components/transactions/TransactionsSort"
import TransactionsTable, {
  type TransactionsTableProps
} from "@/components/transactions/TransactionsTable"
import {
  DEFAULT_TRANSACTION_SORT,
  type TransactionSortOption
} from "@/components/transactions/transactionSort"
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { FinaBadge, FinaSurface } from "@/components/ui/fina"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCreditCardBillMutation } from "@/data/creditCardBills/useCreditCardBillMutation"
import { useCreditCardBill } from "@/data/creditCardBills/useCreditCardBills"
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation"
import { toast } from "@/hooks/use-toast"
import type { CreditCardBillStatus } from "@fina/types"
import dayjs from "dayjs"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Landmark,
  Link2,
  ReceiptText,
  TriangleAlert,
  Unlink2
} from "lucide-react"
import { useCallback, useState } from "react"
import { Link, useParams } from "react-router"

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
    copy: "Link the checking-account payment to remove it from grouped totals."
  },
  reconciled: {
    label: "Reconciled",
    tone: "lime",
    copy: "The linked payment is excluded from grouped totals."
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
  const [sort, setSort] = useState<TransactionSortOption>(
    DEFAULT_TRANSACTION_SORT
  )

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

  if (isLoading) {
    return (
      <FinaPage>
        <div className="p-8 font-mono text-xs font-black uppercase">
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
            <h1 className="text-2xl font-black uppercase">
              Bill not available
            </h1>
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

  const { bill, transactions, candidates } = data
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
    <FinaPage>
      <FinaPageHeader
        eyebrow="Credit card bill"
        marker={dayjs(bill.dueDate).format("MM/YY")}
        title={`${bill.accountName} bill`}
        description={
          <div className="flex flex-wrap items-center gap-3">
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
          className="grid border-l-2 border-t-2 border-fina-ink sm:grid-cols-2 xl:grid-cols-4"
        >
          <div className="border-b-2 border-r-2 border-fina-ink bg-fina-ink p-5 text-white">
            <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/65">
              <CreditCard className="size-4" /> Bill total
            </div>
            <div className="mt-4 font-mono text-3xl font-black tracking-[-0.06em]">
              {currencyFormatter.format(bill.total)}
            </div>
          </div>
          <div className="border-b-2 border-r-2 border-fina-ink bg-fina-lime p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em]">
              <CalendarDays className="size-4" /> Due date
            </div>
            <div className="mt-4 text-2xl font-black uppercase tracking-[-0.05em]">
              {dayjs(bill.dueDate).format("DD MMM YYYY")}
            </div>
          </div>
          <div className="border-b-2 border-r-2 border-fina-ink bg-fina-sky p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em]">
              <ReceiptText className="size-4" /> Entries
            </div>
            <div className="mt-4 text-3xl font-black tracking-[-0.06em]">
              {bill.transactionCount}
            </div>
          </div>
          <div className="border-b-2 border-r-2 border-fina-ink bg-fina-yellow p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em]">
              {bill.status === "reconciled" || bill.status === "empty" ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <TriangleAlert className="size-4" />
              )}
              {bill.status === "empty" ? "Bill status" : "Reconciliation"}
            </div>
            <div className="mt-4 text-lg font-black uppercase tracking-[-0.04em]">
              {status.label}
            </div>
          </div>
        </section>

        <section aria-labelledby="reconciliation-title">
          <div className="mb-4">
            <FinaSectionLabel>Payment / Reconciliation</FinaSectionLabel>
            <h2
              id="reconciliation-title"
              className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]"
            >
              {bill.status === "empty"
                ? "No payment required"
                : "Match the bill payment"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-fina-ink/65">
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
                  <p className="font-black uppercase">Nothing to reconcile</p>
                  <p className="mt-1 text-sm font-semibold text-fina-ink/65">
                    This bill stays in the ledger on its due date with a zero
                    total.
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
                <div className="flex size-11 shrink-0 items-center justify-center border-2 border-fina-ink bg-fina-surface">
                  <Link2 className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-fina-ink/55">
                    Linked checking payment
                  </div>
                  <div className="mt-1 truncate text-lg font-black">
                    {bill.payment.description || "Untitled payment"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] font-bold uppercase">
                    <span>{bill.payment.accountName}</span>
                    <span>
                      {dayjs(bill.payment.date).format("DD MMM YYYY")}
                    </span>
                    <span>{currencyFormatter.format(bill.payment.value)}</span>
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
                description="The checking transaction will return to grouped totals and this bill will need reconciliation."
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
                    <div className="flex size-10 shrink-0 items-center justify-center border-2 border-fina-ink bg-fina-sky">
                      <Landmark className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-black">
                        {candidate.description || "Untitled payment"}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] font-bold uppercase text-fina-ink/60">
                        <span>{candidate.accountName}</span>
                        <span>
                          {dayjs(candidate.date).format("DD MMM YYYY")}
                        </span>
                        <span>{currencyFormatter.format(candidate.value)}</span>
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
                    description="The payment remains visible in inline mode, but is excluded from grouped totals."
                    confirmText="Reconcile payment"
                    onConfirm={() => void reconcile(candidate.transactionId)}
                  />
                </FinaSurface>
              ))}
            </div>
          ) : (
            <FinaSurface tone="yellow" className="p-5">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-black uppercase">No matching payment</p>
                  <p className="mt-1 text-sm font-semibold text-fina-ink/65">
                    Add or correct the checking-account transaction, then return
                    here to reconcile it.
                  </p>
                </div>
              </div>
            </FinaSurface>
          )}
        </section>

        <section aria-labelledby="bill-transactions-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <FinaSectionLabel>Bill / Transactions</FinaSectionLabel>
              <h2
                id="bill-transactions-title"
                className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]"
              >
                Purchases in this bill
              </h2>
            </div>
            <TransactionsSort value={sort} onValueChange={setSort} />
          </div>
          <TransactionsTable
            data={transactions}
            totalCount={transactions.length}
            pageIndex={0}
            pageSize={5000}
            sort={sort}
            isLoading={false}
            isError={false}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransactions={handleDeleteTransactions}
          />
        </section>
      </main>
    </FinaPage>
  )
}
