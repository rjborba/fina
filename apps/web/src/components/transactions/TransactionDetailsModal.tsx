import type { BankaccountOutputDto, CategoryOutputDto } from "@/api/generated"
import { FinaBadge } from "@/components/ui/fina"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts"
import { useCategories } from "@/data/categories/useCategories"
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation"
import { dayjs } from "@/dayjs"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { TransactionOutput } from "@fina/types"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  Hash,
  Landmark,
  Layers3,
  ReceiptText
} from "lucide-react"
import React, {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react"

import { Button } from "../ui/button"
import { TransactionReviewMonth } from "./TransactionReviewMonth"
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
  tone?: "surface" | "sky" | "yellow"
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
})

function formatDate(value: string | null | undefined) {
  return value ? dayjs(value).format("ddd, DD MMM YYYY") : "—"
}

function DetailCell({ icon, label, value, tone = "surface" }: DetailCellProps) {
  const toneClass = {
    surface: "bg-fina-surface",
    sky: "bg-fina-sky",
    yellow: "bg-fina-yellow"
  }[tone]

  return (
    <div className={cn("min-h-20 border-fina-ink p-3", toneClass)}>
      <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.17em] text-fina-ink/55">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-black tracking-[-0.025em]">{value}</div>
    </div>
  )
}

function KeyboardKey({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-6 items-center justify-center border border-fina-ink bg-fina-surface px-1.5 py-1 font-mono text-[9px] font-black shadow-[2px_2px_0_#050505]">
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

  const [highlightNextButton, setHighlightNextButton] = useState(false)
  const [highlightPreviousButton, setHighlightPreviousButton] = useState(false)

  const dialogContentRef = useRef<HTMLDivElement>(null)
  const highlightNextRef = useRef<NodeJS.Timeout | null>(null)
  const highlightPreviousRef = useRef<NodeJS.Timeout | null>(null)

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
          title: "Could not categorize this transaction",
          variant: "destructive"
        })
      }
    },
    [transaction, updateTransaction]
  )

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        onOpenChange(false)
        return
      }

      if (!categoriesData || !transaction) return

      const target = event.target
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

        if (highlightPreviousRef.current) {
          clearTimeout(highlightPreviousRef.current)
        }

        event.preventDefault()
        event.stopPropagation()
        onPreviousTransaction()
        setHighlightPreviousButton(true)
        highlightPreviousRef.current = setTimeout(() => {
          setHighlightPreviousButton(false)
        }, 300)
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        if (!hasNextTransaction) return

        if (highlightNextRef.current) {
          clearTimeout(highlightNextRef.current)
        }

        event.preventDefault()
        event.stopPropagation()
        onNextTransaction()
        setHighlightNextButton(true)
        highlightNextRef.current = setTimeout(() => {
          setHighlightNextButton(false)
        }, 300)
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
  const billMonth = (
    transaction?.creditDueDate ??
    transaction?.toBeConsideredAt ??
    transaction?.calculatedDate
  )?.slice(0, 7)
  const AccountIcon = accountIsCredit ? CreditCard : Landmark
  const hasInstallment = Boolean(
    transaction?.installmentCurrent && transaction.installmentTotal
  )
  const hasValue =
    transaction?.value !== null && transaction?.value !== undefined
  const isIncome = (transaction?.value ?? 0) > 0
  const categoryShortcutCount = Math.min(categoriesData?.length ?? 0, 9)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogContentRef}
        className="max-h-[calc(100svh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-7xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-none border-[3px] border-fina-ink bg-fina-grid p-0 text-fina-ink shadow-fina-lg outline-none [&>button]:right-4 [&>button]:top-4 [&>button]:rounded-none [&>button]:border-2 [&>button]:border-fina-ink [&>button]:bg-fina-surface [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:shadow-fina-sm [&>button]:hover:bg-fina-yellow"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          dialogContentRef.current?.focus()
        }}
      >
        <DialogHeader className="grid space-y-0 border-b-[3px] border-fina-ink bg-fina-yellow px-5 py-4 pr-16 text-left lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-8 lg:px-6 lg:pr-16">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FinaBadge>Transaction / Details</FinaBadge>
              <FinaBadge tone="surface">
                {currentTransactionIndex + 1} / {totalTransactions}
              </FinaBadge>
            </div>
            <DialogTitle className="mt-3 max-w-4xl text-2xl font-black uppercase leading-[0.92] tracking-[-0.05em] sm:text-3xl lg:text-4xl">
              {transaction?.description || "Untitled transaction"}
            </DialogTitle>
            <DialogDescription className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-fina-ink/55">
              <span className="inline-flex items-center gap-1.5">
                <Hash className="size-3" /> {transaction?.id ?? "—"}
              </span>
              <span>{formatDate(transaction?.date)}</span>
            </DialogDescription>
          </div>

          <div
            className={cn(
              "mt-4 min-w-64 border-2 border-fina-ink px-4 py-3 shadow-fina-sm lg:mt-0",
              isIncome ? "bg-fina-lime" : "bg-fina-ink text-white"
            )}
          >
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] opacity-55">
              Posted value
            </div>
            <div className="mt-1 whitespace-nowrap font-mono text-[clamp(1.6rem,2.5vw,2.4rem)] font-black leading-none tracking-[-0.07em]">
              {hasValue
                ? currencyFormatter.format(transaction.value ?? 0)
                : "—"}
            </div>
            <div className="mt-2 font-mono text-[8px] font-black uppercase tracking-[0.13em] opacity-60">
              {isIncome ? "Income / Credit" : "Expense / Debit"}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto">
          <section
            aria-labelledby="transaction-facts-title"
            className="border-fina-ink p-4 sm:p-5"
          >
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.17em] text-fina-ink/50">
              Ledger / Facts
            </div>
            <h3
              id="transaction-facts-title"
              className="mt-1 text-xl font-black uppercase tracking-[-0.04em]"
            >
              Transaction data
            </h3>

            <div className="mt-3 grid overflow-hidden border-l-2 border-t-2 border-fina-ink sm:grid-cols-2 lg:grid-cols-4">
              <div className="border-b-2 border-r-2 border-fina-ink">
                <DetailCell
                  icon={<CalendarDays className="size-3.5" />}
                  label="Transaction date"
                  value={formatDate(transaction?.date)}
                />
              </div>
              <div className="border-b-2 border-r-2 border-fina-ink">
                <DetailCell
                  icon={<AccountIcon className="size-3.5" />}
                  label="Account"
                  tone="sky"
                  value={
                    <div>
                      <div>{accountData?.name ?? "—"}</div>
                      {accountData?.type ? (
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.11em] text-fina-ink/55">
                          <AccountIcon className="size-3" />
                          {accountIsCredit ? "Credit card" : "Checking account"}
                        </div>
                      ) : null}
                    </div>
                  }
                />
              </div>
              {transaction?.creditDueDate ? (
                <div className="border-b-2 border-r-2 border-fina-ink">
                  <DetailCell
                    icon={<CalendarDays className="size-3.5" />}
                    label="Credit due date"
                    value={formatDate(transaction.creditDueDate)}
                  />
                </div>
              ) : null}
              {transaction?.reviewMonth ? (
                <div className="border-b-2 border-r-2 border-fina-ink">
                  <DetailCell
                    icon={<CalendarDays className="size-3.5" />}
                    label="Review month"
                    value={
                      <div>
                        {dayjs(`${transaction.reviewMonth}-01`).format(
                          "MMMM YYYY"
                        )}
                        {accountIsCredit &&
                        transaction.bankaccount &&
                        billMonth ? (
                          <a
                            className="mt-2 block text-xs font-bold underline underline-offset-2"
                            href={`/credit-card-bills/${transaction.bankaccount.id}/${billMonth}`}
                          >
                            Change month for the whole bill
                          </a>
                        ) : null}
                      </div>
                    }
                  />
                </div>
              ) : null}
              {hasInstallment ? (
                <div className="border-b-2 border-r-2 border-fina-ink">
                  <DetailCell
                    icon={<Layers3 className="size-3.5" />}
                    label="Installment"
                    tone="yellow"
                    value={`${transaction?.installmentCurrent}/${transaction?.installmentTotal}`}
                  />
                </div>
              ) : null}
              <div className="border-b-2 border-r-2 border-fina-ink">
                <DetailCell
                  icon={<FileSpreadsheet className="size-3.5" />}
                  label="Source"
                  tone="yellow"
                  value={transaction?.import?.fileName ?? "Manual entry"}
                />
              </div>
              <div className="border-b-2 border-r-2 border-fina-ink">
                <DetailCell
                  icon={<Layers3 className="size-3.5" />}
                  label="Workspace"
                  value={transaction?.group.name ?? "—"}
                />
              </div>
              <div className="border-b-2 border-r-2 border-fina-ink">
                <DetailCell
                  icon={<CalendarDays className="size-3.5" />}
                  label="Added"
                  value={
                    transaction?.createdAt
                      ? dayjs(transaction.createdAt).format("DD MMM YY, HH:mm")
                      : "—"
                  }
                />
              </div>
              {transaction?.calculatedDate ? (
                <div className="border-b-2 border-r-2 border-fina-ink">
                  <DetailCell
                    icon={<CalendarDays className="size-3.5" />}
                    label="Calculated"
                    value={formatDate(transaction.calculatedDate)}
                  />
                </div>
              ) : null}
              {transaction?.toBeConsideredAt ? (
                <div className="border-b-2 border-r-2 border-fina-ink">
                  <DetailCell
                    icon={<CalendarDays className="size-3.5" />}
                    label="Considered"
                    value={formatDate(transaction.toBeConsideredAt)}
                  />
                </div>
              ) : null}
              {transaction?.observation ? (
                <div className="border-b-2 border-r-2 border-fina-ink sm:col-span-2">
                  <DetailCell
                    icon={<ReceiptText className="size-3.5" />}
                    label="Observation"
                    value={transaction.observation}
                  />
                </div>
              ) : null}
            </div>
          </section>

          {transaction && !accountIsCredit && !transaction.billPayment ? (
            <TransactionReviewMonth
              key={`${transaction.id}:${transaction.reviewMonth}`}
              reviewMonth={transaction.reviewMonth}
              onSave={async (reviewMonth) => {
                await updateTransaction({
                  id: transaction.id,
                  transaction: { reviewMonth }
                })
              }}
            />
          ) : null}

          <section
            aria-labelledby="transaction-category-title"
            className="border-t-[3px] border-fina-ink bg-fina-surface p-4 sm:p-5 xl:grid xl:grid-cols-[11rem_minmax(0,1fr)] xl:items-center xl:gap-5"
          >
            <div>
              <div className="font-mono text-[9px] font-black uppercase tracking-[0.17em] text-fina-ink/50">
                Edit / Category
              </div>
              <h3
                id="transaction-category-title"
                className="mt-1 text-xl font-black uppercase tracking-[-0.04em]"
              >
                Categorize
              </h3>
              <p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-fina-ink/50">
                {categoryShortcutCount > 0
                  ? `Keys 1–${categoryShortcutCount} · 0 clears`
                  : "0 clears"}
              </p>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:mt-0">
              {categoriesData?.map((category, index) => {
                const isSelected = transaction?.category?.id === category.id
                return (
                  <Button
                    key={category.id}
                    onClick={() => void handleCategorySelect(category)}
                    variant={isSelected ? "fina-primary" : "fina-secondary"}
                    className="h-auto min-h-9 min-w-0 justify-start px-2 py-1.5 normal-case"
                    aria-pressed={isSelected}
                  >
                    <KeyboardKey>{index < 9 ? index + 1 : "—"}</KeyboardKey>
                    <CategoryAppearance
                      icon={category.icon}
                      color={category.color}
                      className="size-6 border"
                    />
                    <span className="min-w-0 whitespace-normal break-words text-left text-[11px] font-black leading-tight">
                      {category.name || "Untitled"}
                    </span>
                  </Button>
                )
              })}

              <Button
                variant={categoryName ? "fina-secondary" : "fina-primary"}
                className="h-auto min-h-9 min-w-0 justify-start px-2 py-1.5 normal-case"
                aria-pressed={!categoryName}
                onClick={() => void handleCategorySelect(null)}
              >
                <KeyboardKey>0</KeyboardKey>
                <span className="min-w-0 whitespace-normal break-words text-left text-[11px] font-black leading-tight">
                  Uncategorized
                </span>
              </Button>
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-3 border-t-[3px] border-fina-ink bg-fina-sky p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <Button
            variant="fina-secondary"
            className={cn("justify-between sm:min-w-40", {
              "bg-fina-lime": highlightPreviousButton
            })}
            disabled={!hasPreviousTransaction}
            onClick={onPreviousTransaction}
          >
            <ArrowLeft />
            <span>Previous</span>
            <span className="flex gap-1">
              <KeyboardKey>
                <ArrowUp className="size-3" />
              </KeyboardKey>
              <KeyboardKey>
                <ArrowLeft className="size-3" />
              </KeyboardKey>
            </span>
          </Button>

          <div className="hidden font-mono text-[9px] font-black uppercase tracking-[0.14em] text-fina-ink/55 lg:block">
            Arrow keys browse · Number keys categorize
          </div>

          <Button
            variant="fina-primary"
            className={cn("justify-between sm:min-w-40", {
              "bg-fina-yellow": highlightNextButton
            })}
            disabled={!hasNextTransaction}
            onClick={onNextTransaction}
          >
            <span className="flex gap-1">
              <KeyboardKey>
                <ArrowDown className="size-3" />
              </KeyboardKey>
              <KeyboardKey>
                <ArrowRight className="size-3" />
              </KeyboardKey>
            </span>
            <span>Next</span>
            <ArrowRight />
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
