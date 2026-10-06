// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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
  TransactionDetailsModal: () => (
    <div role="dialog" aria-label="Transaction details" />
  )
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
  dueDate: "2026-06-27",
  transactionCount: 3,
  total: -100,
  status: "needs-reconciliation",
  payment: null
} satisfies CreditCardBillSummary

const emptyBill = {
  ...bill,
  billMonth: "2026-12",
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
})
