import { TransactionNote } from "./TransactionNote"
import type { BankaccountOutputDto, CategoryOutputDto } from "@/api/generated"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import { FinancialInstitutionLogo } from "@/components/accounts/FinancialInstitutionLogo"
import { CardLabel } from "@/components/creditCards/CardLabel"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts"
import { useCategories } from "@/data/categories/useCategories"
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation"
import { dayjs } from "@/dayjs"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { TransactionOutput } from "@fina/types"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  Layers3,
  ReceiptText
} from "lucide-react"
import React, { type ReactNode, useCallback, useEffect, useRef } from "react"

import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../ui/dialog"

interface TransactionDetailsModalProps {
  transaction: TransactionOutput | null
  onNextTransaction: () => void
  onPreviousTransaction: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  totalTransactions: number
  currentTransactionIndex: number
}

interface DetailCellProps {
  icon: ReactNode
  label: string
  value: ReactNode
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
})

function formatDate(value: string | null | undefined) {
  return value ? dayjs(value).format("ddd, DD MMM YYYY") : "—"
}

function DetailCell({ icon, label, value }: DetailCellProps) {
  return (
    <div className="min-w-0 px-1 py-3 sm:py-4">
      <div className="flex items-center gap-2 text-[11px] font-medium text-foreground/50">
        {icon}
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium leading-relaxed [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  )
}

function KeyboardKey({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-4 items-center justify-center text-[10px] font-normal text-current/45">
      {children}
    </span>
  )
}

export function TransactionDetailsModal({
  transaction,
  open,
  onOpenChange,
  onNextTransaction,
  onPreviousTransaction,
  totalTransactions,
  currentTransactionIndex
}: TransactionDetailsModalProps) {
  const { selectedGroup } = useActiveGroup()
  const { data: bankAccountsData } = useBankAccounts({
    groupId: selectedGroup?.id?.toString()
  })
  const { updateMutation } = useTransactionMutation()
  const { mutateAsync: updateTransaction } = updateMutation
  const { data: categoriesData } = useCategories({
    groupId: selectedGroup?.id?.toString()
  })

  const dialogContentRef = useRef<HTMLDivElement>(null)

  const hasNextTransaction = currentTransactionIndex < totalTransactions - 1
  const hasPreviousTransaction = currentTransactionIndex > 0

  const accountsMapById = React.useMemo(() => {
    if (!bankAccountsData) return {}
    return bankAccountsData.reduce(
      (acc: Record<string, BankaccountOutputDto>, current) => {
        acc[current.id] = current
        return acc
      },
      {}
    )
  }, [bankAccountsData])

  const categoriesMapById = React.useMemo(() => {
    if (!categoriesData) return {}
    return categoriesData.reduce(
      (acc: Record<string, CategoryOutputDto>, current) => {
        acc[current.id] = current
        return acc
      },
      {}
    )
  }, [categoriesData])

  const handleCategorySelect = useCallback(
    async (
      category: Pick<CategoryOutputDto, "id" | "name" | "icon" | "color"> | null
    ) => {
      if (!transaction || updateMutation.isPending) return

      try {
        await updateTransaction({
          id: transaction.id,
          transaction: { category }
        })
      } catch {
        toast({
          title: "Could not categorize this transaction",
          variant: "destructive"
        })
      }
    },
    [transaction, updateTransaction, updateMutation.isPending]
  )

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target
      // Open pickers own their search, option navigation, and first Escape.
      if (
        target instanceof HTMLElement &&
        (target.closest('[cmdk-root], [role="listbox"]') ||
          target.closest('[role="combobox"]')?.getAttribute("aria-expanded") ===
            "true")
      )
        return
      if (
        target instanceof HTMLElement &&
        target.closest("[data-note-control]")
      )
        return
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        onOpenChange(false)
        return
      }

      if (!categoriesData || !transaction || updateMutation.isPending) return

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.isComposing ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            Boolean(
              target.closest('input, textarea, select, [role="combobox"]')
            )))
      ) {
        return
      }

      const digitFromCode = /^(?:Digit|Numpad)([0-9])$/.exec(event.code)?.[1]
      const digit = /^[0-9]$/.test(event.key) ? event.key : digitFromCode

      if (digit !== undefined) {
        const category =
          digit === "0" ? null : categoriesData[Number(digit) - 1]
        if (digit !== "0" && !category) return

        event.preventDefault()
        event.stopPropagation()
        void handleCategorySelect(category)
        return
      }

      if (event.key === " ") {
        event.preventDefault()
        event.stopPropagation()
        void handleCategorySelect(null)
        return
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        if (!hasPreviousTransaction) return

        event.preventDefault()
        event.stopPropagation()
        onPreviousTransaction()
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        if (!hasNextTransaction) return

        event.preventDefault()
        event.stopPropagation()
        onNextTransaction()
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [
    categoriesData,
    handleCategorySelect,
    updateMutation.isPending,
    hasNextTransaction,
    hasPreviousTransaction,
    onNextTransaction,
    onOpenChange,
    open,
    onPreviousTransaction,
    transaction
  ])

  const accountData = transaction
    ? transaction.bankaccount
      ? (accountsMapById[transaction.bankaccount.id] ?? transaction.bankaccount)
      : null
    : null
  const categoryName = transaction?.category?.id
    ? (categoriesMapById[transaction.category.id]?.name ??
      transaction.category.name)
    : null
  const accountIsCredit = accountData?.type === "credit"
  const AccountIcon = accountIsCredit ? CreditCard : Landmark
  const hasInstallment = Boolean(
    transaction?.installmentCurrent && transaction.installmentTotal
  )
  const hasValue =
    transaction?.value !== null && transaction?.value !== undefined
  const isIncome = (transaction?.value ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogContentRef}
        className="max-h-[calc(100svh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg border border-fina-grid bg-fina-canvas p-0 text-foreground shadow-fina-lg outline-none [&>button]:right-4 [&>button]:top-4 [&>button]:rounded-md [&>button]:border-0 [&>button]:bg-transparent [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:shadow-none [&>button]:hover:bg-fina-canvas"
        onEscapeKeyDown={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.closest("[data-note-editor]")
          )
            event.preventDefault()
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          dialogContentRef.current?.focus()
        }}
      >
        <DialogHeader className="grid space-y-0 border-b border-fina-grid bg-fina-canvas px-5 py-5 pr-16 text-left lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8 lg:px-6 lg:pr-16">
          <div className="min-w-0">
            <DialogTitle className="max-w-2xl break-words text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              {transaction?.description || "Untitled transaction"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Transaction #{transaction?.id ?? "—"}
            </DialogDescription>
          </div>

          <div
            className={cn(
              "mt-4 lg:mt-0 lg:text-right",
              isIncome
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-foreground"
            )}
          >
            <div className="whitespace-nowrap text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {hasValue
                ? currencyFormatter.format(transaction.value ?? 0)
                : "—"}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto">
          <section
            aria-labelledby="transaction-facts-title"
            className="border-fina-grid p-4 sm:p-5"
          >
            <h3 id="transaction-facts-title" className="sr-only">
              Transaction data
            </h3>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3">
              <div className="min-w-0">
                <DetailCell
                  icon={<CalendarDays className="size-3.5" />}
                  label="Transaction date"
                  value={formatDate(transaction?.date)}
                />
              </div>
              <div className="min-w-0">
                <DetailCell
                  icon={
                    <FinancialInstitutionLogo
                      institutionId={accountData?.institutionId}
                      accountName={accountData?.name}
                      accountType={accountData?.type}
                      className="size-3.5"
                      decorative
                    />
                  }
                  label="Account"
                  value={
                    <div>
                      <div>{accountData?.name ?? "—"}</div>
                      {accountData?.type ? (
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.11em] text-foreground/55">
                          <AccountIcon className="size-3" />
                          {accountIsCredit ? "Credit card" : "Checking account"}
                        </div>
                      ) : null}
                      {accountIsCredit &&
                      transaction &&
                      (transaction.cardName || transaction.cardLast4) ? (
                        <div className="mt-1 text-xs font-normal text-foreground/60">
                          <CardLabel card={transaction} />
                        </div>
                      ) : null}
                    </div>
                  }
                />
              </div>
              {transaction?.creditDueDate ? (
                <div className="min-w-0">
                  <DetailCell
                    icon={<CalendarDays className="size-3.5" />}
                    label="Credit due date"
                    value={formatDate(transaction.creditDueDate)}
                  />
                </div>
              ) : null}
              {hasInstallment ? (
                <div className="min-w-0">
                  <DetailCell
                    icon={<Layers3 className="size-3.5" />}
                    label="Installment"
                    value={`${transaction?.installmentCurrent}/${transaction?.installmentTotal}`}
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <DetailCell
                  icon={<FileSpreadsheet className="size-3.5" />}
                  label="Source"
                  value={transaction?.import?.fileName ?? "Manual entry"}
                />
              </div>
              <div className="min-w-0">
                <DetailCell
                  icon={<Layers3 className="size-3.5" />}
                  label="Workspace"
                  value={transaction?.group.name ?? "—"}
                />
              </div>
              {transaction ? (
                <div className="min-w-0 border-t sm:col-span-2 lg:col-span-3">
                  <DetailCell
                    icon={<ReceiptText className="size-3.5" />}
                    label="Note"
                    value={
                      <TransactionNote
                        key={transaction.id}
                        value={transaction.observation}
                        disabled={updateMutation.isPending}
                        onSave={(observation) =>
                          updateTransaction({
                            id: transaction.id,
                            transaction: { observation }
                          })
                        }
                      />
                    }
                  />
                </div>
              ) : null}
            </div>
            <p className="mt-2 px-1 text-[11px] text-foreground/35">
              Added{" "}
              {transaction?.createdAt
                ? dayjs(transaction.createdAt).format("DD MMM YYYY, HH:mm")
                : "—"}
            </p>
          </section>

          <section
            aria-labelledby="transaction-category-title"
            className="border-t border-fina-grid p-4 sm:p-5"
          >
            <div>
              <h3
                id="transaction-category-title"
                className="text-xs font-medium text-foreground/55"
              >
                Category
              </h3>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categoriesData?.map((category, index) => {
                const isSelected = transaction?.category?.id === category.id
                return (
                  <Button
                    key={category.id}
                    disabled={updateMutation.isPending}
                    onClick={() => void handleCategorySelect(category)}
                    variant={isSelected ? "fina-primary" : "fina-secondary"}
                    className="h-auto min-h-9 min-w-0 justify-start px-2 py-1.5 normal-case"
                    aria-pressed={isSelected}
                  >
                    <KeyboardKey>{index < 9 ? index + 1 : "—"}</KeyboardKey>
                    <CategoryAppearance color={category.color} />
                    <span className="min-w-0 whitespace-normal break-words text-left text-[11px] font-semibold leading-tight">
                      {category.name || "Untitled"}
                    </span>
                  </Button>
                )
              })}

              <Button
                disabled={updateMutation.isPending}
                variant={categoryName ? "fina-secondary" : "fina-primary"}
                className="h-auto min-h-9 min-w-0 justify-start px-2 py-1.5 normal-case"
                aria-pressed={!categoryName}
                onClick={() => void handleCategorySelect(null)}
              >
                <KeyboardKey>0</KeyboardKey>
                <span className="min-w-0 whitespace-normal break-words text-left text-[11px] font-semibold leading-tight">
                  Uncategorized
                </span>
              </Button>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-fina-grid px-4 py-3 sm:px-5">
          <Button
            variant="ghost"
            size="sm"
            disabled={updateMutation.isPending || !hasPreviousTransaction}
            onClick={() => {
              if (!updateMutation.isPending) onPreviousTransaction()
            }}
          >
            <ArrowLeft className="size-4" /> Previous
          </Button>
          <span className="text-xs tabular-nums text-foreground/40">
            {currentTransactionIndex + 1} of {totalTransactions}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={updateMutation.isPending || !hasNextTransaction}
            onClick={() => {
              if (!updateMutation.isPending) onNextTransaction()
            }}
          >
            Next <ArrowRight className="size-4" />
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
