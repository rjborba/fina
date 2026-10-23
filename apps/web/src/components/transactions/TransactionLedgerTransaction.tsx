import { useTranslation } from "react-i18next"
import { FinaBadge } from "@/components/ui/fina"
import { CardLabel } from "@/components/creditCards/CardLabel"
import { EditableSelect } from "@/data/transactions/EditableSelectCell"
import type { CategoryOutput, TransactionOutput } from "@fina/types"
import { useAtom } from "jotai"
import type { FC } from "react"
import { openSelectIdAtom } from "./OpenSelectAtom"
import { TransactionMetadataGrid } from "./TransactionMetadataGrid"
import type { TransactionRowLayout } from "./transactionRowLayout"
import {
  TransactionAccountChip,
  CreditCardIndicator,
  ImportSourceIndicator
} from "./TransactionMetadataIcons"

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

const TransactionCategoryChip: FC<
  Pick<
    TransactionLedgerTransactionProps,
    "transaction" | "categories" | "onUpdateTransaction" | "disabled"
  >
> = ({ transaction, categories, onUpdateTransaction, disabled = false }) => {
  const { t } = useTranslation()

  const [openSelectId, setOpenSelectId] = useAtom(openSelectIdAtom)

  return (
    <div
      className="flex w-full min-w-0 shrink-0 justify-end"
      onClick={(event) => event.stopPropagation()}
    >
      <EditableSelect
        disabled={disabled}
        value={transaction.category?.id || null}
        options={categories}
        ariaLabel={t("Change category for {{value0}}", {
          value0: transaction.description
        })}
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
  const { t } = useTranslation()

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
          aria-label={t("Open transaction: {{value0}}", {
            value0: transaction.description || t("Untitled transaction")
          })}
          data-testid="transaction-description"
          title={transaction.description || t("Untitled transaction")}
          className="min-w-0 shrink cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[13px] font-normal outline-none focus-visible:underline"
        >
          {transaction.description || t("Untitled transaction")}
        </button>
      }
      icons={{
        import: transaction.import ? (
          <ImportSourceIndicator sourceImport={transaction.import} />
        ) : null,
        "card-icon":
          transaction.bankaccount?.type === "credit" ? (
            <CreditCardIndicator card={transaction} />
          ) : null
      }}
      cells={{
        status: transaction.billPayment ? (
          <FinaBadge
            tone="lime"
            className="max-w-full truncate border-0 px-1.5 py-0.5 text-[10px]"
          >
            {t("Reconciled")}
          </FinaBadge>
        ) : null,
        account: transaction.bankaccount ? (
          <TransactionAccountChip account={transaction.bankaccount} />
        ) : null,
        card:
          transaction.bankaccount?.type === "credit" ? (
            <span
              className="w-full min-w-0 text-xs text-foreground/60"
              data-testid="transaction-card"
            >
              <CardLabel
                card={transaction}
                className="w-full justify-end"
                showLast4={false}
              />
            </span>
          ) : null,
        "card-number":
          transaction.bankaccount?.type === "credit" &&
          transaction.cardLast4 ? (
            <span
              data-testid="transaction-card-number"
              className="truncate text-xs tabular-nums text-foreground/45"
              title={t("Card ending {{value0}}", {
                value0: transaction.cardLast4
              })}
            >
              {`••${transaction.cardLast4}`}
            </span>
          ) : null,
        installment: installment ? (
          <span
            title={installment}
            className="w-full truncate text-right text-xs tabular-nums text-foreground/45"
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
