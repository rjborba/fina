import { formatCurrency } from "@/i18n"
import { useTranslation } from "react-i18next"
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
  icon?: ReactNode
  label: string
  value: ReactNode
}

const currencyFormatter = { format: formatCurrency }

function formatDate(value: string | null | undefined) {
  return value ? dayjs(value).format("ddd, DD MMM YYYY") : "—"
}

function DetailCell({ icon, label, value }: DetailCellProps) {
  return (
    <div className="min-w-0 py-3">
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
    <span className="inline-flex min-w-4 items-center text-xs font-normal text-current/45">
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
  const { t } = useTranslation()

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
      if (!transaction) return

      try {
        await updateTransaction({
          id: transaction.id,
          transaction: { category }
        })
      } catch {
        toast({
          title: t("Could not categorize this transaction"),
          variant: "destructive"
        })
      }
    },
    [t, transaction, updateTransaction]
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

      if (!categoriesData || !transaction) return

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
        className="max-h-[calc(100svh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg border border-fina-grid bg-fina-canvas p-0 text-foreground shadow-fina-lg outline-none md:h-[min(44rem,calc(100svh-2rem))] [&>button]:right-4 [&>button]:top-4 [&>button]:rounded-md [&>button]:border-0 [&>button]:bg-transparent [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:shadow-none [&>button]:hover:bg-fina-canvas"
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
        <DialogHeader className="grid space-y-0 border-b border-fina-grid bg-fina-canvas px-5 py-6 pr-16 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-6 sm:pr-16">
          <div className="min-w-0">
            <DialogTitle className="break-words text-xl font-semibold leading-snug tracking-tight [overflow-wrap:anywhere] sm:text-2xl">
              {transaction?.description || t("Untitled transaction")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("Transaction #")}
              {transaction?.id ?? "—"}
            </DialogDescription>
          </div>

          <div className="relative mt-3 min-w-0 justify-self-end pt-6 sm:mt-0">
            {hasInstallment ? (
              <span
                role="group"
                aria-label={t("Installment")}
                className="absolute left-0 top-0 whitespace-nowrap text-sm font-semibold leading-5 tabular-nums text-foreground/55"
              >
                {`${transaction?.installmentCurrent}/${transaction?.installmentTotal}`}
              </span>
            ) : null}
            <div
              role="group"
              aria-label={t("Amount")}
              className={cn(
                "whitespace-nowrap text-right text-3xl font-semibold leading-tight tracking-tight sm:text-4xl",
                isIncome
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-foreground"
              )}
            >
              {hasValue
                ? currencyFormatter.format(transaction.value ?? 0)
                : "—"}
            </div>
          </div>
        </DialogHeader>

        <div className="fina-scrollbar grid min-h-0 auto-rows-max overflow-y-auto md:auto-rows-auto md:grid-cols-[minmax(0,1fr)_17rem] md:overflow-hidden lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section
            aria-labelledby="transaction-category-title"
            className="fina-scrollbar min-h-0 min-w-0 p-5 sm:p-6 md:overflow-y-auto"
          >
            <h3
              id="transaction-category-title"
              className="text-xs font-medium text-foreground/55"
            >
              {t("Category")}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
              {categoriesData?.map((category, index) => {
                const isSelected = transaction?.category?.id === category.id
                return (
                  <Button
                    key={category.id}
                    onClick={() => void handleCategorySelect(category)}
                    variant={isSelected ? "fina-primary" : "fina-secondary"}
                    className="h-auto min-h-24 min-w-0 flex-col items-start justify-between gap-5 rounded-lg px-4 py-3 normal-case transition-colors duration-75"
                    aria-pressed={isSelected}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <KeyboardKey>{index < 9 ? index + 1 : "—"}</KeyboardKey>
                      <CategoryAppearance
                        color={category.color}
                        className="size-2.5"
                      />
                    </span>
                    <span className="min-w-0 whitespace-normal break-words text-left text-sm font-semibold leading-snug [overflow-wrap:anywhere]">
                      {category.name || t("Untitled")}
                    </span>
                  </Button>
                )
              })}

              <Button
                variant={categoryName ? "fina-secondary" : "fina-primary"}
                className="h-auto min-h-24 min-w-0 flex-col items-start justify-between gap-5 rounded-lg px-4 py-3 normal-case transition-colors duration-75"
                aria-pressed={!categoryName}
                onClick={() => void handleCategorySelect(null)}
              >
                <KeyboardKey>0</KeyboardKey>
                <span className="min-w-0 whitespace-normal break-words text-left text-sm font-semibold leading-snug [overflow-wrap:anywhere]">
                  {t("Uncategorized")}
                </span>
              </Button>
            </div>
          </section>

          <aside
            aria-labelledby="transaction-facts-title"
            className="fina-scrollbar min-h-0 min-w-0 border-t border-fina-grid px-5 py-3 sm:px-6 md:overflow-y-auto md:border-l md:border-t-0 md:[scrollbar-gutter:stable]"
          >
            <h3 id="transaction-facts-title" className="sr-only">
              {t("Transaction data")}
            </h3>
            <DetailCell
              icon={<CalendarDays className="size-3.5" />}
              label={t("Transaction date")}
              value={formatDate(transaction?.date)}
            />
            {accountIsCredit ? (
              <DetailCell
                icon={<CreditCard className="size-3.5" />}
                label={t("Card")}
                value={<CardLabel card={transaction} className="max-w-full" />}
              />
            ) : null}
            <DetailCell
              label={t("Account")}
              value={
                <div className="flex items-center gap-2">
                  <FinancialInstitutionLogo
                    institutionId={accountData?.institutionId}
                    accountName={accountData?.name}
                    accountType={accountData?.type}
                    className="size-6 shrink-0 text-foreground"
                    decorative
                  />
                  <span>{accountData?.name ?? "—"}</span>
                </div>
              }
            />
            {transaction ? (
              <DetailCell
                icon={<ReceiptText className="size-3.5" />}
                label={t("Note")}
                value={
                  <TransactionNote
                    key={transaction.id}
                    value={transaction.observation}
                    onSave={(observation) =>
                      updateTransaction({
                        id: transaction.id,
                        transaction: { observation }
                      })
                    }
                  />
                }
              />
            ) : null}
            <div className="mt-2 border-t border-fina-grid">
              {transaction?.creditDueDate ? (
                <DetailCell
                  icon={<CalendarDays className="size-3.5" />}
                  label={t("Credit due date")}
                  value={formatDate(transaction.creditDueDate)}
                />
              ) : null}
              <DetailCell
                icon={<FileSpreadsheet className="size-3.5" />}
                label={t("Source")}
                value={transaction?.import?.fileName ?? t("Manual entry")}
              />
              <DetailCell
                icon={<Layers3 className="size-3.5" />}
                label={t("Workspace")}
                value={transaction?.group.name ?? "—"}
              />
              <p className="py-3 text-[11px] text-foreground/35">
                {t("Added")}{" "}
                {transaction?.createdAt
                  ? dayjs(transaction.createdAt).format("DD MMM YYYY, HH:mm")
                  : "—"}
              </p>
            </div>
          </aside>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-fina-grid px-4 py-3 sm:px-5">
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasPreviousTransaction}
            onClick={onPreviousTransaction}
          >
            <ArrowLeft className="size-4" /> {t("Previous")}
          </Button>
          <span className="text-xs tabular-nums text-foreground/40">
            {currentTransactionIndex + 1} {t("of")} {totalTransactions}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasNextTransaction}
            onClick={onNextTransaction}
          >
            {t("Next")} <ArrowRight className="size-4" />
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
