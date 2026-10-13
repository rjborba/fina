import { FinaBadge } from "@/components/ui/fina"
import { FinancialInstitutionLogo } from "@/components/accounts/FinancialInstitutionLogo"
import { CardLabel } from "@/components/creditCards/CardLabel"
import { EditableSelect } from "@/data/transactions/EditableSelectCell"
import type { CategoryOutput, TransactionOutput } from "@fina/types"
import { useAtom } from "jotai"
import { FileUp } from "lucide-react"
import type { FC, ReactNode } from "react"
import { openSelectIdAtom } from "./OpenSelectAtom"
import { TransactionMetadataGrid } from "./TransactionMetadataGrid"
import type { TransactionRowLayout } from "./transactionRowLayout"
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
  layout: TransactionRowLayout
  disabled?: boolean
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
        data-transaction-metadata="true"
        aria-label={ariaLabel}
        tabIndex={0}
        className="inline-flex shrink-0 cursor-help items-center text-foreground/45 outline-none focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-fina-violet"
      >
        {children}
      </span>
    </TooltipTrigger>
    <TooltipContent
      side="top"
      sideOffset={6}
      className="rounded-md border border-fina-grid bg-fina-ink font-mono text-[10px] font-semibold text-white shadow-fina-sm"
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
        <FinancialInstitutionLogo
          institutionId={account.institutionId}
          accountName={account.name}
          accountType={account.type}
          className="size-3.5 shrink-0"
          decorative
        />
      </TransactionIconTooltip>
    )
  }

  if (account.type === "checkout") {
    return (
      <TransactionIconTooltip
        ariaLabel={`Checking account: ${account.name}`}
        tooltip={account.name}
      >
        <FinancialInstitutionLogo
          institutionId={account.institutionId}
          accountName={account.name}
          accountType={account.type}
          className="size-3.5 shrink-0"
          decorative
        />
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

const TransactionCategoryChip: FC<
  Pick<
    TransactionLedgerTransactionProps,
    "transaction" | "categories" | "onUpdateTransaction" | "disabled"
  >
> = ({ transaction, categories, onUpdateTransaction, disabled = false }) => {
  const [openSelectId, setOpenSelectId] = useAtom(openSelectIdAtom)

  return (
    <div
      className="w-32 min-w-0 shrink-0"
      onClick={(event) => event.stopPropagation()}
    >
      <EditableSelect
        disabled={disabled}
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
> = ({
  transaction,
  categories,
  onUpdateTransaction,
  disabled = false,
  layout
}) => {
  const installment =
    transaction.installmentCurrent && transaction.installmentTotal
      ? `${transaction.installmentCurrent}/${transaction.installmentTotal}`
      : null

  return (
    <TransactionMetadataGrid
      layout={layout}
      description={
        <button
          type="button"
          disabled={disabled}
          tabIndex={-1}
          data-list-open="true"
          aria-label={`Open transaction: ${transaction.description || "Untitled transaction"}`}
          data-testid="transaction-description"
          title={transaction.description || "Untitled transaction"}
          className="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[13px] font-normal outline-none focus-visible:underline"
        >
          {transaction.description || "Untitled transaction"}
        </button>
      }
      cells={{
        "account-icon": transaction.bankaccount ? (
          <AccountTypeIndicator account={transaction.bankaccount} />
        ) : null,
        import: transaction.import ? (
          <ImportSourceIndicator sourceImport={transaction.import} />
        ) : null,
        status: transaction.billPayment ? (
          <FinaBadge
            tone="lime"
            className="max-w-full truncate border-0 px-1.5 py-0.5 text-[10px]"
          >
            Reconciled
          </FinaBadge>
        ) : null,
        account: transaction.bankaccount ? (
          <span
            title={transaction.bankaccount.name}
            className="min-w-0 truncate text-xs text-foreground/45"
          >
            {transaction.bankaccount.name}
          </span>
        ) : null,
        card:
          transaction.bankaccount?.type === "credit" ? (
            <span
              className="w-full min-w-0 text-xs text-foreground/60"
              data-testid="transaction-card"
            >
              <CardLabel
                card={transaction.creditCard}
                className="w-full"
                showArchived
              />
            </span>
          ) : null,
        installment: installment ? (
          <span
            title={installment}
            className="w-full truncate text-xs tabular-nums text-foreground/45"
          >
            {installment}
          </span>
        ) : null,
        category: (
          <TransactionCategoryChip
            transaction={transaction}
            categories={categories}
            onUpdateTransaction={onUpdateTransaction}
            disabled={disabled}
          />
        )
      }}
    />
  )
}
