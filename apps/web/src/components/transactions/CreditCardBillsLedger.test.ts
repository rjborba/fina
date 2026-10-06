import { describe, expect, it } from "vitest"
import type { CreditCardBillSummary, TransactionOutput } from "@fina/types"
import { buildGroupedLedgerRows } from "./groupedLedgerRows"

const transaction = (
  id: string,
  type: "checkout" | "credit",
  value: number,
  date: string
): TransactionOutput =>
  ({
    id,
    description: id,
    value,
    calculatedDate: date,
    toBeConsideredAt: null,
    date: `${date}T00:00:00.000Z`,
    bankaccount: { id: type, name: type, type, dueDate: null }
  }) as TransactionOutput

const bill = (paymentTransactionId?: string): CreditCardBillSummary => ({
  accountId: "credit",
  accountName: "Main card",
  billMonth: "2026-06",
  dueDate: "2026-06-05",
  transactionCount: 1,
  total: -100,
  status: paymentTransactionId ? "reconciled" : "needs-reconciliation",
  payment: paymentTransactionId
    ? {
        transactionId: paymentTransactionId,
        description: "Card payment",
        value: -100,
        date: "2026-06-05",
        accountId: "checkout",
        accountName: "Checking"
      }
    : null
})

describe("buildGroupedLedgerRows", () => {
  it("replaces credit transactions with one bill row", () => {
    const rows = buildGroupedLedgerRows(
      [
        transaction("checking-expense", "checkout", -20, "2026-06-03"),
        transaction("credit-child", "credit", -100, "2026-05-20")
      ],
      [bill()],
      "date-desc"
    )

    expect(rows.map((row) => row.key)).toEqual([
      "bill-credit-2026-06",
      "transaction-checking-expense"
    ])
    expect(rows[0]).toMatchObject({ kind: "bill", value: -100 })
  })

  it("excludes a linked checking payment from grouped rows", () => {
    const rows = buildGroupedLedgerRows(
      [
        transaction("payment", "checkout", -100, "2026-06-05"),
        transaction("groceries", "checkout", -30, "2026-06-04")
      ],
      [bill("payment")],
      "date-desc"
    )

    expect(rows.map((row) => row.key)).toEqual([
      "bill-credit-2026-06",
      "transaction-groceries"
    ])
  })

  it("keeps description and category sorting available with bill rows", () => {
    const alpha = transaction("alpha", "checkout", -20, "2026-06-03")
    alpha.description = "Alpha"
    alpha.category = {
      id: "home",
      name: "Home",
      icon: "house",
      color: "lime"
    }
    const zebra = transaction("zebra", "checkout", -30, "2026-06-04")
    zebra.description = "Zebra"
    zebra.category = {
      id: "food",
      name: "Food",
      icon: "utensils",
      color: "violet"
    }

    expect(
      buildGroupedLedgerRows([zebra, alpha], [bill()], "description-asc").map(
        (row) => row.key
      )
    ).toEqual(["transaction-alpha", "bill-credit-2026-06", "transaction-zebra"])
    expect(
      buildGroupedLedgerRows([alpha, zebra], [bill()], "category-asc").map(
        (row) => row.key
      )
    ).toEqual(["bill-credit-2026-06", "transaction-zebra", "transaction-alpha"])
  })
})
