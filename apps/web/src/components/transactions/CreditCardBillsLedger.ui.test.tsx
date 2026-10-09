// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react"
import type { CreditCardBillSummary, TransactionOutput } from "@fina/types"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CreditCardBillsLedger } from "./CreditCardBillsLedger"

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: vi.fn()
}))

vi.mock("react-router", () => ({
  useNavigate: () => mocks.navigate
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast })
}))

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({ selectedGroup: { id: "group-1" } })
}))

vi.mock("@/data/categories/useCategories", () => ({
  useCategories: () => ({
    data: [
      {
        id: "category-1",
        name: "Groceries",
        icon: "shopping-cart",
        color: "lime"
      },
      {
        id: "category-2",
        name: "Housing",
        icon: "house",
        color: "lime"
      },
      {
        id: "category-3",
        name: "Transport",
        icon: "car",
        color: "lime"
      },
      {
        id: "category-4",
        name: "Apparel",
        icon: "shirt",
        color: "lime"
      }
    ]
  })
}))

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 88,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 88
      }))
  })
}))

vi.mock("./TransactionDetailsModal", () => ({
  TransactionDetailsModal: ({
    transaction,
    open,
    onOpenChange,
    totalTransactions,
    currentTransactionIndex,
    onNextTransaction,
    onPreviousTransaction
  }: {
    transaction: TransactionOutput | null
    open: boolean
    onOpenChange: (open: boolean) => void
    totalTransactions: number
    currentTransactionIndex: number
    onNextTransaction: () => void
    onPreviousTransaction: () => void
  }) =>
    open ? (
      <div role="dialog" aria-label="Transaction details">
        <span>{transaction?.description}</span>
        <span>{transaction?.category?.name || "Uncategorized"}</span>
        <span>
          {currentTransactionIndex + 1} of {totalTransactions}
        </span>
        <button
          type="button"
          onClick={onPreviousTransaction}
          disabled={currentTransactionIndex === 0}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNextTransaction}
          disabled={currentTransactionIndex === totalTransactions - 1}
        >
          Next
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close
        </button>
      </div>
    ) : null
}))

const checkingTransaction = {
  id: "checking-1",
  createdAt: "2026-06-09T00:00:00.000Z",
  description: "Checking purchase",
  value: -10,
  date: "2026-06-09T00:00:00.000Z",
  installmentTotal: null,
  installmentCurrent: null,
  creditDueDate: null,
  observation: null,
  toBeConsideredAt: null,
  calculatedDate: "2026-06-09",
  billPayment: null,
  reviewMonth: "2026-06",
  cashFlowDate: "2026-06-20",
  cashFlowStatus: "confirmed",
  bankaccount: {
    id: "checking-account",
    name: "Checking",
    type: "checkout",
    dueDate: null
  },
  category: {
    id: "category-1",
    name: "Groceries",
    icon: "shopping-cart",
    color: "lime"
  },
  group: { id: "group-1", name: "Group" },
  import: null
} satisfies TransactionOutput

const bill = {
  accountId: "credit-account",
  accountName: "Main card",
  billMonth: "2026-06",
  reviewMonth: "2026-06",
  cashFlowDate: "2026-06-27",
  dueDate: "2026-06-27",
  transactionCount: 3,
  total: -100,
  status: "needs-reconciliation",
  payment: null
} satisfies CreditCardBillSummary

const emptyBill = {
  ...bill,
  billMonth: "2026-12",
  reviewMonth: "2026-12",
  cashFlowDate: "2026-12-27",
  dueDate: "2026-12-27",
  transactionCount: 0,
  total: 0,
  status: "empty"
} satisfies CreditCardBillSummary

describe("CreditCardBillsLedger selection", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("shows checking transaction dates while grouped bills retain their review month", () => {
    render(
      <CreditCardBillsLedger
        transactions={[
          { ...checkingTransaction, date: "2026-07-02T00:00:00.000Z" },
          {
            ...checkingTransaction,
            id: "earlier",
            description: "Earlier purchase",
            date: "2026-05-12T00:00:00.000Z"
          }
        ]}
        bills={[bill]}
        sort="date-desc"
        dateBasis="monthly-review"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )

    expect(
      screen.getByRole("columnheader", { name: "Date" })
    ).toBeInTheDocument()
    const rows = screen.getAllByRole("row").slice(1)
    expect(
      within(rows[0]).getByRole("cell", { name: "02 Jul 2026" })
    ).toBeInTheDocument()
    expect(
      within(rows[1]).getByRole("cell", { name: "Jun 2026" })
    ).toBeInTheDocument()
    expect(
      within(rows[2]).getByRole("cell", { name: "12 May 2026" })
    ).toBeInTheDocument()
  })

  it("selects a grouped checking transaction on command-click", () => {
    render(
      <CreditCardBillsLedger
        transactions={[checkingTransaction]}
        bills={[bill]}
        sort="date-desc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )

    const row = screen.getByTestId("grouped-transaction-row")
    fireEvent.click(row, { metaKey: true })

    expect(row).toHaveAttribute("aria-selected", "true")
    expect(
      screen.getByRole("combobox", {
        name: "Change category for Checking purchase"
      })
    ).toHaveTextContent("Groceries")
    expect(screen.getByText("1 selected")).toBeInTheDocument()
    expect(
      screen.queryByRole("dialog", { name: "Transaction details" })
    ).not.toBeInTheDocument()
  })

  it("does not navigate when command-clicking a derived bill", () => {
    render(
      <CreditCardBillsLedger
        transactions={[checkingTransaction]}
        bills={[bill]}
        sort="date-desc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )

    fireEvent.click(screen.getByTestId("credit-card-bill-row"), {
      metaKey: true
    })

    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "Turn on inline credit card transactions to select bill purchases"
    })
  })

  it("renders a scheduled empty bill as a zero-value ledger row", () => {
    render(
      <CreditCardBillsLedger
        transactions={[]}
        bills={[emptyBill]}
        sort="date-desc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )

    expect(screen.getByTestId("credit-card-bill-row")).toBeInTheDocument()
    expect(screen.getByText("Empty")).toBeInTheDocument()
    expect(screen.getByText("0 transactions")).toBeInTheDocument()
  })

  it("keeps the opening order when categorization moves a checking row", () => {
    const transactions = [
      { ...checkingTransaction, id: "a", description: "Purchase A" },
      {
        ...checkingTransaction,
        id: "b",
        description: "Purchase B",
        category: {
          ...checkingTransaction.category,
          id: "category-2",
          name: "Housing"
        }
      },
      {
        ...checkingTransaction,
        id: "c",
        description: "Purchase C",
        category: {
          ...checkingTransaction.category,
          id: "category-3",
          name: "Transport"
        }
      }
    ]
    const props = {
      bills: [bill],
      sort: "category-asc" as const,
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(
      <CreditCardBillsLedger {...props} transactions={transactions} />
    )

    fireEvent.click(screen.getAllByTestId("grouped-transaction-row")[0])
    const details = within(
      screen.getByRole("dialog", { name: "Transaction details" })
    )
    expect(details.getByText("Purchase A")).toBeInTheDocument()
    expect(details.getByText("1 of 3")).toBeInTheDocument()
    fireEvent.click(details.getByRole("button", { name: "Next" }))
    expect(details.getByText("Purchase B")).toBeInTheDocument()

    rerender(
      <CreditCardBillsLedger
        {...props}
        transactions={transactions.map((transaction) =>
          transaction.id === "b"
            ? {
                ...transaction,
                category: {
                  ...checkingTransaction.category,
                  id: "category-4",
                  name: "Apparel"
                }
              }
            : transaction
        )}
      />
    )

    const firstRow = screen.getAllByTestId("grouped-transaction-row")[0]
    expect(within(firstRow).getByText("Purchase B")).toBeInTheDocument()
    expect(details.getByText("Apparel")).toBeInTheDocument()
    expect(details.getByText("2 of 3")).toBeInTheDocument()
    fireEvent.click(details.getByRole("button", { name: "Next" }))
    expect(details.getByText("Purchase C")).toBeInTheDocument()
    expect(details.getByRole("button", { name: "Next" })).toBeDisabled()
    fireEvent.click(details.getByRole("button", { name: "Previous" }))
    expect(details.getByText("Purchase B")).toBeInTheDocument()
    expect(details.getByText("Apparel")).toBeInTheDocument()
    fireEvent.click(details.getByRole("button", { name: "Previous" }))
    expect(details.getByText("Purchase A")).toBeInTheDocument()
    expect(details.getByRole("button", { name: "Previous" })).toBeDisabled()
  })

  it("skips removed transactions, ignores additions, and refreshes on reopening", () => {
    const transactions = ["A", "B", "C", "D"].map((letter) => ({
      ...checkingTransaction,
      id: letter,
      description: `Purchase ${letter}`
    }))
    const props = {
      bills: [bill],
      sort: "description-asc" as const,
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(
      <CreditCardBillsLedger {...props} transactions={transactions} />
    )

    fireEvent.click(screen.getAllByTestId("grouped-transaction-row")[0])
    const details = within(
      screen.getByRole("dialog", { name: "Transaction details" })
    )
    expect(details.getByText("Purchase A")).toBeInTheDocument()
    rerender(
      <CreditCardBillsLedger
        {...props}
        transactions={[
          ...transactions.filter((transaction) => transaction.id !== "B"),
          { ...checkingTransaction, id: "AA", description: "Purchase AA" }
        ]}
      />
    )

    expect(details.getByText("1 of 3")).toBeInTheDocument()
    fireEvent.click(details.getByRole("button", { name: "Next" }))
    expect(details.getByText("Purchase C")).toBeInTheDocument()
    fireEvent.click(details.getByRole("button", { name: "Next" }))
    expect(details.getByText("Purchase D")).toBeInTheDocument()
    expect(details.getByRole("button", { name: "Next" })).toBeDisabled()
    fireEvent.click(details.getByRole("button", { name: "Close" }))
    expect(
      screen.queryByRole("dialog", { name: "Transaction details" })
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByTestId("grouped-transaction-row")[1])
    const reopenedDetails = within(
      screen.getByRole("dialog", { name: "Transaction details" })
    )
    expect(reopenedDetails.getByText("Purchase AA")).toBeInTheDocument()
    expect(reopenedDetails.getByText("2 of 4")).toBeInTheDocument()
    fireEvent.click(reopenedDetails.getByRole("button", { name: "Next" }))
    expect(reopenedDetails.getByText("Purchase C")).toBeInTheDocument()
  })
})
