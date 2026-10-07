// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {
  CategoryOutput,
  CreditCardBillDetail,
  TransactionOutput
} from "@fina/types"
import { getDefaultStore } from "jotai"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { TransactionsTableProps } from "@/components/transactions/TransactionsTable"
import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import { CreditCardBill } from "./CreditCardBill"

const mocks = vi.hoisted(() => ({
  groupId: "group-1",
  accountId: "card-1",
  billMonth: "2026-07",
  data: undefined as CreditCardBillDetail | undefined,
  categories: [] as CategoryOutput[],
  updateTransaction: vi.fn(),
  removeTransactions: vi.fn(),
  reconcile: vi.fn(),
  unlink: vi.fn(),
  reviewMonth: vi.fn()
}))

const food = {
  id: "food",
  name: "Food",
  icon: "coffee",
  color: "yellow"
} as const
const transport = {
  id: "transport",
  name: "Transport",
  icon: "car",
  color: "sky"
} as const

const transaction = {
  id: "coffee-purchase",
  createdAt: "2026-06-18T00:00:00.000Z",
  description: "Coffee purchase",
  value: -100,
  date: "2026-06-18T00:00:00.000Z",
  installmentTotal: null,
  installmentCurrent: null,
  creditDueDate: "2026-07-10",
  observation: null,
  toBeConsideredAt: null,
  calculatedDate: "2026-07-10",
  reviewMonth: "2026-06",
  cashFlowDate: "2026-07-10",
  cashFlowStatus: "scheduled",
  billPayment: null,
  bankaccount: {
    id: "card-1",
    name: "Fixture card",
    type: "credit",
    dueDate: 10
  },
  category: food,
  group: { id: "group-1", name: "Fixture household" },
  import: null
} satisfies TransactionOutput

const payment = {
  transactionId: "payment-1",
  accountId: "checking-1",
  accountName: "Fixture checking",
  description: "Fixture whole bill payment",
  date: "2026-07-09",
  value: -200
}

function fixture(): CreditCardBillDetail {
  return {
    bill: {
      accountId: "card-1",
      accountName: "Fixture card",
      billMonth: "2026-07",
      reviewMonth: "2026-06",
      dueDate: "2026-07-10",
      cashFlowDate: "2026-07-10",
      total: -200,
      transactionCount: 5,
      status: "needs-reconciliation",
      payment: null
    },
    transactions: [
      transaction,
      {
        ...transaction,
        id: "coffee-refund",
        description: "Coffee refund",
        date: "2026-07-02T00:00:00.000Z",
        value: 25
      },
      {
        ...transaction,
        id: "taxi",
        description: "Taxi ride",
        value: -50,
        category: transport
      },
      {
        ...transaction,
        id: "internet",
        description: "Internet service",
        value: -75,
        category: null
      },
      {
        ...transaction,
        id: "untitled",
        description: null,
        value: null,
        category: null
      }
    ],
    candidates: [payment]
  }
}

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useParams: () => ({
    accountId: mocks.accountId,
    billMonth: mocks.billMonth
  })
}))

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({
    selectedGroup: { id: mocks.groupId, name: "Fixture household" }
  })
}))

vi.mock("@/data/categories/useCategories", () => ({
  useCategories: () => ({ data: mocks.categories, isLoading: false })
}))

vi.mock("@/data/creditCardBills/useCreditCardBills", () => ({
  useCreditCardBill: () => ({
    data: mocks.data,
    isLoading: false,
    isError: false
  })
}))

vi.mock("@/data/creditCardBills/useCreditCardBillMutation", () => ({
  useCreditCardBillMutation: () => ({
    reconcileMutation: { mutateAsync: mocks.reconcile, isPending: false },
    unlinkMutation: { mutateAsync: mocks.unlink, isPending: false },
    reviewMonthMutation: { mutateAsync: mocks.reviewMonth, isPending: false }
  })
}))

vi.mock("@/data/transactions/useTransactionsMutation", () => ({
  useTransactionMutation: () => ({
    updateMutation: { mutateAsync: mocks.updateTransaction },
    removeManyMutation: { mutateAsync: mocks.removeTransactions }
  })
}))

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }))

// Project the page's table inputs; table editing/selection has its own UI tests.
vi.mock("@/components/transactions/TransactionsTable", () => ({
  default: ({ data, totalCount, dateBasis }: TransactionsTableProps) => (
    <div data-testid="bill-purchases" data-date-basis={dateBasis}>
      <span data-testid="purchase-count">{totalCount}</span>
      {(data ?? []).map((purchase) => (
        <span key={purchase.id}>
          {purchase.description || "Untitled purchase"}
        </span>
      ))}
    </div>
  )
}))

function Page() {
  return (
    <MemoryRouter>
      <CreditCardBill />
    </MemoryRouter>
  )
}

async function openFilters() {
  await userEvent.click(screen.getByRole("button", { name: /^Filter/ }))
}

function expectPurchases(names: string[]) {
  const purchases = within(screen.getByTestId("bill-purchases"))
  expect(purchases.getByTestId("purchase-count")).toHaveTextContent(
    String(names.length)
  )
  for (const description of [
    "Coffee purchase",
    "Coffee refund",
    "Taxi ride",
    "Internet service",
    "Untitled purchase"
  ]) {
    if (names.includes(description)) {
      expect(purchases.getByText(description, { exact: true })).toBeVisible()
    } else {
      expect(purchases.queryByText(description, { exact: true })).toBeNull()
    }
  }
}

describe("credit-card bill purchase filters", () => {
  beforeEach(() => {
    mocks.groupId = "group-1"
    mocks.accountId = "card-1"
    mocks.billMonth = "2026-07"
    mocks.data = fixture()
    mocks.categories = [food, transport].map((category) => ({
      ...category,
      createdAt: "2026-01-01T00:00:00.000Z",
      groupId: "group-1"
    }))
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date("2030-01-01T00:00:00.000Z"),
      endDate: new Date("2030-01-31T23:59:59.999Z"),
      partialDescription: "Unrelated ledger search",
      categoriesId: ["unrelated-category"]
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("searches descriptions case-insensitively without inheriting ledger dates or filters", async () => {
    render(<Page />)
    expectPurchases([
      "Coffee purchase",
      "Coffee refund",
      "Taxi ride",
      "Internet service",
      "Untitled purchase"
    ])
    expect(screen.getByTestId("bill-purchases")).toHaveAttribute(
      "data-date-basis",
      "purchase-date"
    )
    await openFilters()
    await userEvent.type(screen.getByLabelText("Search description"), "COFFEE")
    await waitFor(() => expectPurchases(["Coffee purchase", "Coffee refund"]))
    expect(screen.getByText("2 of 5 purchases")).toBeVisible()
    expect(screen.getByLabelText("Matching purchases total")).toHaveTextContent(
      /[-−]R\$\s*75,00/
    )
    expect(
      getDefaultStore().get(transactionFilterAtom).partialDescription
    ).toBe("Unrelated ledger search")
    expect(getDefaultStore().get(transactionFilterAtom).categoriesId).toEqual([
      "unrelated-category"
    ])
  })

  it("combines selected categories with OR, then intersects them with description search", async () => {
    render(<Page />)
    await openFilters()
    await userEvent.click(screen.getByRole("checkbox", { name: "Food" }))
    expectPurchases(["Coffee purchase", "Coffee refund"])
    await userEvent.click(screen.getByRole("checkbox", { name: "Transport" }))
    expectPurchases(["Coffee purchase", "Coffee refund", "Taxi ride"])
    await userEvent.type(screen.getByLabelText("Search description"), "coffee")
    await waitFor(() => expectPurchases(["Coffee purchase", "Coffee refund"]))
    await userEvent.click(screen.getByRole("checkbox", { name: "Food" }))
    await waitFor(() =>
      expect(screen.getByText("No purchases match these filters")).toBeVisible()
    )
    expect(screen.queryByTestId("bill-purchases")).toBeNull()
    await userEvent.click(
      screen.getAllByRole("button", { name: "Clear filters" })[0]
    )
    await waitFor(() =>
      expectPurchases([
        "Coffee purchase",
        "Coffee refund",
        "Taxi ride",
        "Internet service",
        "Untitled purchase"
      ])
    )
    expect(screen.getByLabelText("Search description")).toHaveValue("")
    expect(
      screen.getByRole("checkbox", { name: "Transport" })
    ).not.toBeChecked()
    expect(screen.queryByLabelText("Matching purchases total")).toBeNull()
  })

  it("supports None alongside another category without excluding uncategorized null descriptions", async () => {
    render(<Page />)
    await openFilters()
    await userEvent.click(screen.getByRole("checkbox", { name: "None" }))
    expectPurchases(["Internet service", "Untitled purchase"])
    await userEvent.click(screen.getByRole("checkbox", { name: "Food" }))
    expectPurchases([
      "Coffee purchase",
      "Coffee refund",
      "Internet service",
      "Untitled purchase"
    ])
    await userEvent.type(
      screen.getByLabelText("Search description"),
      "internet"
    )
    await waitFor(() => expectPurchases(["Internet service"]))
  })

  it("keeps the complete bill total and candidate reconciliation when purchases are filtered", async () => {
    render(<Page />)
    const summary = screen.getByRole("region", { name: "Bill summary" })
    const summaryBefore = summary.textContent
    await openFilters()
    await userEvent.type(screen.getByLabelText("Search description"), "refund")
    await waitFor(() => expectPurchases(["Coffee refund"]))
    expect(summary.textContent).toBe(summaryBefore)
    expect(screen.getByText("Fixture whole bill payment")).toBeVisible()
    expect(screen.getByRole("button", { name: "Reconcile" })).toBeEnabled()
    expect(mocks.reconcile).not.toHaveBeenCalled()
    expect(mocks.unlink).not.toHaveBeenCalled()
    expect(mocks.updateTransaction).not.toHaveBeenCalled()
  })

  it("rounds the matching aggregate like the bill total rather than rounding each purchase", async () => {
    const current = mocks.data!
    mocks.data = {
      ...current,
      bill: { ...current.bill, total: -0.01, transactionCount: 2 },
      transactions: [
        { ...transaction, value: -0.004, category: null },
        {
          ...transaction,
          id: "second-small-purchase",
          description: "Second small purchase",
          value: -0.004,
          category: null
        }
      ],
      candidates: []
    }
    render(<Page />)
    await openFilters()
    await userEvent.click(screen.getByRole("checkbox", { name: "None" }))
    expect(screen.getByText("2 of 2 purchases")).toBeVisible()
    expect(screen.getByLabelText("Matching purchases total")).toHaveTextContent(
      /[-−]R\$\s*0,01/
    )
    expect(
      screen.getByRole("region", { name: "Bill summary" })
    ).toHaveTextContent(/[-−]R\$\s*0,01/)
  })

  it("preserves the linked payment when no purchases match", async () => {
    const current = mocks.data!
    mocks.data = {
      ...current,
      bill: {
        ...current.bill,
        payment,
        status: "reconciled",
        cashFlowDate: payment.date
      }
    }
    render(<Page />)
    const linkedPayment = screen.getByText(
      "Linked checking payment"
    ).parentElement!
    const paymentBefore = linkedPayment.textContent
    await openFilters()
    await userEvent.type(
      screen.getByLabelText("Search description"),
      "no match"
    )
    await waitFor(() =>
      expect(screen.getByText("No purchases match these filters")).toBeVisible()
    )
    expect(screen.getByText("Linked checking payment")).toBeVisible()
    expect(screen.getByText("Fixture whole bill payment")).toBeVisible()
    expect(linkedPayment.textContent).toBe(paymentBefore)
    expect(screen.getByRole("button", { name: "Unlink payment" })).toBeEnabled()
    expect(
      screen.getByRole("region", { name: "Bill summary" })
    ).toHaveTextContent("Reconciled")
  })

  it.each(["groupId", "accountId", "billMonth"] as const)(
    "resets local filters when %s changes without clearing ledger filters",
    async (key) => {
      const view = render(<Page />)
      await openFilters()
      await userEvent.click(screen.getByRole("checkbox", { name: "Food" }))
      await userEvent.type(
        screen.getByLabelText("Search description"),
        "refund"
      )
      await waitFor(() => expectPurchases(["Coffee refund"]))
      mocks[key] = key === "billMonth" ? "2026-08" : `${mocks[key]}-next`
      view.rerender(<Page />)
      await waitFor(() =>
        expectPurchases([
          "Coffee purchase",
          "Coffee refund",
          "Taxi ride",
          "Internet service",
          "Untitled purchase"
        ])
      )
      expect(screen.queryByLabelText("Matching purchases total")).toBeNull()
      expect(
        getDefaultStore().get(transactionFilterAtom).partialDescription
      ).toBe("Unrelated ledger search")
    }
  )

  it("reapplies active filters when refetched purchases have edited categories", async () => {
    const view = render(<Page />)
    await openFilters()
    await userEvent.click(screen.getByRole("checkbox", { name: "Food" }))
    expectPurchases(["Coffee purchase", "Coffee refund"])
    const current = mocks.data!
    mocks.data = {
      ...current,
      transactions: current.transactions.map((purchase) =>
        purchase.id === "coffee-purchase"
          ? { ...purchase, category: transport }
          : purchase
      )
    }
    view.rerender(<Page />)
    expectPurchases(["Coffee refund"])
    expect(screen.getByRole("checkbox", { name: "Food" })).toBeChecked()
    expect(screen.getByText("1 of 5 purchases")).toBeVisible()
  })

  it("cancels a pending description draft when the page clears category filters", async () => {
    render(<Page />)
    await openFilters()
    await userEvent.click(screen.getByRole("checkbox", { name: "Food" }))
    fireEvent.change(screen.getByLabelText("Search description"), {
      target: { value: "refund" }
    })
    const purchases = screen.getByRole("region", {
      name: "Purchases in this bill"
    })
    fireEvent.click(
      within(purchases).getByRole("button", {
        name: "Clear filters"
      })
    )
    expect(screen.getByLabelText("Search description")).toHaveValue("")
    await new Promise((resolve) => window.setTimeout(resolve, 250))
    expectPurchases([
      "Coffee purchase",
      "Coffee refund",
      "Taxi ride",
      "Internet service",
      "Untitled purchase"
    ])
    expect(screen.queryByLabelText("Matching purchases total")).toBeNull()
    expect(screen.getByRole("checkbox", { name: "Food" })).not.toBeChecked()
  })

  it("distinguishes an empty scheduled bill from a filtered-out bill", () => {
    const current = mocks.data!
    mocks.data = {
      ...current,
      bill: { ...current.bill, total: 0, transactionCount: 0, status: "empty" },
      transactions: [],
      candidates: []
    }
    render(<Page />)
    expectPurchases([])
    expect(screen.getByText("Nothing to reconcile")).toBeVisible()
    expect(screen.queryByText("No purchases match these filters")).toBeNull()
  })
})
