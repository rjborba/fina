import { FinaBadge } from "@/components/ui/fina"
import { EditableSelect } from "@/data/transactions/EditableSelectCell"
import type { CategoryOutput, TransactionOutput } from "@fina/types"
import { useAtom } from "jotai"
import { CreditCard, FileUp, Landmark } from "lucide-react"
import type { FC, ReactNode } from "react"
import { openSelectIdAtom } from "./OpenSelectAtom"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"

export type TransactionCategoryOption = Pick<
  CategoryOutput,
  "id" | "name" | "icon" | "color"
>

export type UpdateLedgerTransaction = (
  id: string,
  transaction: Partial<TransactionOutput>
) => Promise<void>

interface TransactionLedgerTransactionProps {
  transaction: TransactionOutput
  categories: TransactionCategoryOption[]
  onUpdateTransaction: UpdateLedgerTransaction
}

const TransactionIconTooltip: FC<{
  ariaLabel: string
  tooltip: string
  children: ReactNode
}> = ({ ariaLabel, tooltip, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        className="inline-flex cursor-help items-center text-fina-ink/55 outline-none focus-visible:text-fina-ink focus-visible:ring-2 focus-visible:ring-fina-ink"
      >
        {children}
      </span>
    </TooltipTrigger>
    <TooltipContent
      side="top"
      sideOffset={6}
      className="rounded-none border border-fina-ink bg-fina-ink font-mono text-[10px] font-black uppercase text-white shadow-fina-sm"
    >
      {tooltip}
    </TooltipContent>
  </Tooltip>
)

const AccountTypeIndicator: FC<{
  account: TransactionOutput["bankaccount"]
}> = ({ account }) => {
  if (!account) return null

  if (account.type === "credit") {
    return (
      <TransactionIconTooltip
        ariaLabel={`Credit card account: ${account.name}`}
        tooltip={account.name}
      >
        <CreditCard className="size-3.5 shrink-0" aria-hidden="true" />
      </TransactionIconTooltip>
    )
  }

  if (account.type === "checkout") {
    return (
      <TransactionIconTooltip
        ariaLabel={`Checking account: ${account.name}`}
        tooltip={account.name}
      >
        <Landmark className="size-3.5 shrink-0" aria-hidden="true" />
      </TransactionIconTooltip>
    )
  }

  return null
}

const ImportSourceIndicator: FC<{
  sourceImport: NonNullable<TransactionOutput["import"]>
}> = ({ sourceImport }) => (
  <TransactionIconTooltip
    ariaLabel={`Imported from ${sourceImport.fileName}`}
    tooltip={`Imported from ${sourceImport.fileName}`}
  >
    <FileUp className="size-3.5 shrink-0" aria-hidden="true" />
  </TransactionIconTooltip>
)

const TransactionCategoryChip: FC<TransactionLedgerTransactionProps> = ({
  transaction,
  categories,
  onUpdateTransaction
}) => {
  const [openSelectId, setOpenSelectId] = useAtom(openSelectIdAtom)

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <EditableSelect
        value={transaction.category?.id || null}
        options={categories}
        ariaLabel={`Change category for ${transaction.description}`}
        open={openSelectId === transaction.id}
        onOpenChange={(open) => setOpenSelectId(open ? transaction.id : null)}
        onChange={(value) => {
          setOpenSelectId(null)

          if (value === null) {
            return onUpdateTransaction(transaction.id, { category: null })
          }

          const category = categories.find((option) => option.id === value)
          if (!category) {
            return Promise.reject(new Error("Category not found"))
          }

          return onUpdateTransaction(transaction.id, { category })
        }}
      />
    </div>
  )
}

export const TransactionLedgerTransaction: FC<
  TransactionLedgerTransactionProps
> = ({ transaction, categories, onUpdateTransaction }) => {
  const installment =
    transaction.installmentCurrent && transaction.installmentTotal
      ? `${transaction.installmentCurrent}/${transaction.installmentTotal}`
      : null

  return (
    <div className="flex min-w-max flex-col justify-center gap-1 py-3">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-sm font-black tracking-[-0.02em]">
          {transaction.description || "Untitled transaction"}
        </span>
        <AccountTypeIndicator account={transaction.bankaccount} />
        {transaction.import ? (
          <ImportSourceIndicator sourceImport={transaction.import} />
        ) : null}
        {transaction.billPayment ? (
          <FinaBadge tone="lime" className="px-1.5 py-0.5 text-[8px]">
            Reconciled
          </FinaBadge>
        ) : null}
      </div>
      <div className="flex min-w-max items-center gap-3 whitespace-nowrap">
        <TransactionCategoryChip
          transaction={transaction}
          categories={categories}
          onUpdateTransaction={onUpdateTransaction}
        />
        {installment ? (
          <span className="font-mono text-[10px] font-bold">{installment}</span>
        ) : null}
      </div>
    </div>
  )
}
