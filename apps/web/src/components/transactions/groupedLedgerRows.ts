import type { CreditCardBillSummary, TransactionOutput } from "@fina/types"
import type { TransactionSortOption } from "./transactionSort"

export type GroupedLedgerRow =
  | {
      kind: "transaction"
      key: string
      date: string
      value: number
      transaction: TransactionOutput
    }
  | {
      kind: "bill"
      key: string
      date: string
      value: number
      bill: CreditCardBillSummary
    }

export function buildGroupedLedgerRows(
  transactions: readonly TransactionOutput[],
  bills: readonly CreditCardBillSummary[],
  sort: TransactionSortOption,
  dateBasis: "cash-flow" | "monthly-review" = "cash-flow"
): GroupedLedgerRow[] {
  const linkedPaymentIds = new Set(
    bills.flatMap((bill) => (bill.payment ? [bill.payment.transactionId] : []))
  )
  const rows: GroupedLedgerRow[] = [
    ...transactions
      .filter(
        (transaction) =>
          transaction.bankaccount?.type !== "credit" &&
          !transaction.billPayment &&
          !linkedPaymentIds.has(transaction.id)
      )
      .map(
        (transaction): GroupedLedgerRow => ({
          kind: "transaction",
          key: `transaction-${transaction.id}`,
          date:
            dateBasis === "monthly-review"
              ? transaction.reviewMonth
                ? `${transaction.reviewMonth}-01`
                : ""
              : (transaction.cashFlowDate ??
                transaction.toBeConsideredAt ??
                transaction.calculatedDate ??
                transaction.date?.slice(0, 10) ??
                ""),
          value: transaction.value ?? 0,
          transaction
        })
      ),
    ...bills.map(
      (bill): GroupedLedgerRow => ({
        kind: "bill",
        key: `bill-${bill.accountId}-${bill.billMonth}`,
        date:
          dateBasis === "monthly-review"
            ? `${bill.reviewMonth}-01`
            : bill.cashFlowDate,
        value:
          dateBasis === "monthly-review"
            ? bill.total
            : (bill.payment?.value ?? bill.total),
        bill
      })
    )
  ]
  const direction = sort.endsWith("-asc") ? 1 : -1
  const field = sort.replace(/-(asc|desc)$/, "")

  const textValue = (row: GroupedLedgerRow) => {
    if (field === "description") {
      return row.kind === "bill"
        ? `${row.bill.accountName} bill`
        : row.transaction.description || ""
    }

    return row.kind === "bill" ? "" : row.transaction.category?.name || ""
  }

  return rows.sort((left, right) => {
    const comparison =
      field === "value"
        ? left.value - right.value
        : field === "date"
          ? left.date.localeCompare(right.date)
          : textValue(left).localeCompare(textValue(right), "pt-BR", {
              sensitivity: "base"
            })
    return comparison === 0
      ? left.key.localeCompare(right.key) * direction
      : comparison * direction
  })
}
