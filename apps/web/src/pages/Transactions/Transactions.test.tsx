// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  render,
  screen,
  within,
  fireEvent
} from "@testing-library/react"
import type { CreditCardBillSummary, TransactionOutput } from "@fina/types"
import { getDefaultStore } from "jotai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router"

import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import { Transactions } from "./Transactions"

const mocks = vi.hoisted(() => ({
  updateTransaction: vi.fn(),
  removeTransactions: vi.fn(),
  includePayment: false,
  changedBill: false,
  transactionQueries: [] as Array<{
    accountType?: "checkout" | "credit"
    search?: string
    categoryIdList?: string[]
    dateBasis?: string
  }>
}))

const checkingTransaction = {
  id: "checking-transaction",
  createdAt: "2026-02-10T00:00:00.000Z",
  description: "Checking purchase",
  value: -40,
  date: "2026-02-10T00:00:00.000Z",
  installmentTotal: null,
  installmentCurrent: null,
  creditDueDate: null,
  observation: null,
  toBeConsideredAt: null,
  calculatedDate: "2026-02-10",
  billPayment: null,
  reviewMonth: "2026-02",
  cashFlowDate: "2026-02-10",
  cashFlowStatus: "confirmed",
  bankaccount: {
    id: "checking-account",
    name: "Checking",
    type: "checkout",
    dueDate: null
  },
  category: null,
  group: { id: "group-1", name: "Household" },
  import: null
} satisfies TransactionOutput

const creditTransaction = {
  ...checkingTransaction,
  id: "credit-transaction",
  description: "Card purchase",
  bankaccount: {
    id: "credit-account",
    name: "Main card",
    type: "credit",
    dueDate: 5
  },
  creditDueDate: "2026-03-05",
  cashFlowDate: "2026-03-05",
  cashFlowStatus: "scheduled"
} satisfies TransactionOutput

const bill = {
  accountId: "credit-account",
  accountName: "Main card",
  billMonth: "2026-03",
  reviewMonth: "2026-02",
  cashFlowDate: "2026-03-05",
  dueDate: "2026-03-05",
  transactionCount: 1,
  total: -40,
  status: "needs-reconciliation",
  payment: null
} satisfies CreditCardBillSummary

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({
    selectedGroup: {
      id: "group-1",
      name: "Household"
    }
  })
}))

vi.mock("@/data/transactions/useTransactionsMutation", () => ({
  useTransactionMutation: () => ({
    updateMutation: { mutateAsync: mocks.updateTransaction },
    removeManyMutation: { mutateAsync: mocks.removeTransactions }
  })
}))

vi.mock("@/data/transactions/useTransactions", () => ({
  useTransactions: (
    query: {
      accountType?: "checkout" | "credit"
      search?: string
      categoryIdList?: string[]
    },
    enabled = true
  ) => {
    mocks.transactionQueries.push(query)

    if (!enabled) {
      return { data: undefined, isLoading: false, isError: false }
    }

    const data: TransactionOutput[] =
      query.accountType === "checkout"
        ? [checkingTransaction]
        : [checkingTransaction, creditTransaction]
    if (mocks.includePayment)
      data.push({
        ...checkingTransaction,
        id: "payment",
        description: "Linked payment",
        billPayment: { creditAccountId: "credit-account", billMonth: "2026-01" }
      })

    return {
      data: { data, totalCount: data.length },
      isLoading: false,
      isError: false
    }
  }
}))

vi.mock("@/data/creditCardBills/useCreditCardBills", () => ({
  useCreditCardBills: (_query: unknown, enabled = true) => ({
    data: enabled
      ? [
          mocks.changedBill
            ? {
                ...bill,
                total: -100,
                status: "needs-review",
                payment: {
                  transactionId: "payment",
                  accountId: "checking-account",
                  accountName: "Checking",
                  description: "Synthetic payment",
                  date: "2026-03-04",
                  value: -40
                }
              }
            : bill
        ]
      : [],
    isLoading: false,
    isError: false
  })
}))

vi.mock("@/data/categories/useCategories", () => ({
  useCategories: () => ({ data: [] })
}))

vi.mock("@/components/transactions/TransactionsHeader", () => ({
  TransactionsHeader: ({ totalCount }: { totalCount: number }) => (
    <div>
      <div data-testid="visible-entry-count">{totalCount}</div>
      <button type="button">Filter</button>
    </div>
  )
}))

vi.mock("@/components/transactions/TransactionsFilter", () => ({
  TransactionsFilter: () => <div data-testid="transactions-filter" />
}))

vi.mock("@/components/transactions/TransactionsSort", () => ({
  TransactionsSort: () => <button type="button">Sort</button>
}))

vi.mock("@/components/transactions/TransactionsTable", () => ({
  default: ({ data }: { data: TransactionOutput[] }) => (
    <div data-testid="transactions-table">
      {data.map((transaction) => (
        <span key={transaction.id}>{transaction.description}</span>
      ))}
    </div>
  )
}))

vi.mock("@/components/transactions/CreditCardBillsLedger", () => ({
  CreditCardBillsLedger: ({
    transactions,
    bills
  }: {
    transactions: TransactionOutput[]
    bills: CreditCardBillSummary[]
  }) => (
    <div data-testid="grouped-ledger">
      {transactions.map((transaction) => (
        <span key={transaction.id}>{transaction.description}</span>
      ))}
      {bills.map((currentBill) => (
        <span key={currentBill.billMonth}>{currentBill.accountName} bill</span>
      ))}
    </div>
  )
}))

describe("Transactions cash-flow ledger", () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.transactionQueries.length = 0
    mocks.includePayment = false
    mocks.changedBill = false
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      endDate: new Date("2026-03-31T23:59:59.999Z"),
      partialDescription: "",
      categoriesId: []
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders checking and credit-card purchases in one inline ledger", async () => {
    localStorage.setItem("inlineCreditCardTransactions", "true")
    localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')

    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )

    const ledgers = await screen.findAllByTestId("transactions-table")
    expect(ledgers).toHaveLength(1)
    expect(within(ledgers[0]).getByText("Checking purchase")).toBeVisible()
    expect(within(ledgers[0]).getByText("Card purchase")).toBeVisible()
    expect(screen.queryByText("Main card bill")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Filter" })).toBeVisible()
    expect(screen.getByTestId("transactions-filter")).toBeInTheDocument()
    expect(screen.getByText("Category breakdown")).toBeInTheDocument()
    expect(screen.queryByText("Checking transactions")).not.toBeInTheDocument()
    expect(
      screen.queryByText("Credit card transactions")
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Spending month")).not.toBeInTheDocument()
    expect(screen.getByTestId("visible-entry-count")).toHaveTextContent("2")
  })

  it("renders checking entries and the attributed bill in one grouped ledger", () => {
    localStorage.setItem("inlineCreditCardTransactions", "false")

    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )

    const ledgers = screen.getAllByTestId("grouped-ledger")
    expect(ledgers).toHaveLength(1)
    expect(within(ledgers[0]).getByText("Checking purchase")).toBeVisible()
    expect(within(ledgers[0]).getByText("Main card bill")).toBeVisible()
    expect(
      within(ledgers[0]).queryByText("Card purchase")
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Filter" })).toBeVisible()
    expect(screen.getByTestId("transactions-filter")).toBeInTheDocument()
    expect(screen.getByText("Purchase categories")).toBeInTheDocument()
    expect(screen.queryByText("Checking transactions")).not.toBeInTheDocument()
    expect(screen.queryByText("Credit card bills")).not.toBeInTheDocument()
    expect(screen.getByTestId("visible-entry-count")).toHaveTextContent("2")
  })

  it("keeps transaction filters active while bills are grouped", () => {
    localStorage.setItem("inlineCreditCardTransactions", "false")
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      endDate: new Date("2026-03-31T23:59:59.999Z"),
      partialDescription: "Card",
      categoriesId: ["category-1"]
    })

    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )

    const transactionQuery = mocks.transactionQueries.at(-1)
    expect(transactionQuery).toEqual(
      expect.objectContaining({
        search: "Card",
        categoryIdList: ["category-1"]
      })
    )
    expect(transactionQuery).not.toHaveProperty("accountType")
    expect(screen.getByText("Main card bill")).toBeVisible()
  })

  it("uses the actual paid amount in cash flow even when purchases in the bill change", () => {
    mocks.changedBill = true
    localStorage.setItem("inlineCreditCardTransactions", "true")
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    expect(screen.getByTestId("grouped-ledger")).toBeVisible()
    expect(
      screen.queryByRole("switch", { name: "Inline credit card transactions" })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Totals" }))
    const summary = screen.getByRole("dialog", { name: "Period totals" })
    expect(within(summary).getByText("Net flow")).toBeVisible()
    expect(within(summary).getByText(/-R\$\s80,00/)).toBeVisible()
    expect(within(summary).queryByText(/-R\$\s140,00/)).not.toBeInTheDocument()
  })

  it("switches the requested date basis and persists only the view preference", async () => {
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    expect(screen.getByTestId("grouped-ledger")).toBeVisible()
    expect(mocks.transactionQueries.at(-1)?.dateBasis).toBe("cash-flow")
    fireEvent.click(screen.getByRole("button", { name: "Monthly review" }))
    expect(mocks.transactionQueries.at(-1)?.dateBasis).toBe("monthly-review")
    expect(
      screen.getByRole("button", { name: "Monthly review" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(localStorage.getItem("ledgerDateBasis:v1")).toBe('"monthly-review"')
    fireEvent.click(screen.getByRole("button", { name: "Cash flow" }))
    expect(mocks.transactionQueries.at(-1)?.dateBasis).toBe("cash-flow")
  })

  it.each([true, false])(
    "excludes linked checking payments from another bill month in review mode (inline %s)",
    async (inline) => {
      mocks.includePayment = true
      localStorage.setItem(
        "inlineCreditCardTransactions",
        JSON.stringify(inline)
      )
      localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')
      render(
        <MemoryRouter>
          <Transactions />
        </MemoryRouter>
      )
      await screen.findByTestId(
        inline ? "transactions-table" : "grouped-ledger"
      )
      expect(screen.queryByText("Linked payment")).not.toBeInTheDocument()
      expect(screen.getByTestId("visible-entry-count")).toHaveTextContent("2")
      fireEvent.click(screen.getByRole("button", { name: "Totals" }))
      const summary = screen.getByRole("dialog", { name: "Period totals" })
      expect(within(summary).getByText("Review balance")).toBeVisible()
      expect(within(summary).getByText(/-R\$\s80,00/)).toBeVisible()
    }
  )
})
