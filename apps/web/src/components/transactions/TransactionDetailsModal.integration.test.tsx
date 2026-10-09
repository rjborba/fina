// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {
  QueryTransactionOutputDtoType,
  TransactionOutput
} from "@fina/types"
import {
  QueryClient,
  QueryClientProvider,
  useQuery
} from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TransactionDetailsModal } from "./TransactionDetailsModal"
import TransactionsTable from "./TransactionsTable"

const api = vi.hoisted(() => ({
  categories: vi.fn(),
  update: vi.fn()
}))

vi.mock("@/api/generated", () => ({
  categoriesControllerFindAll: api.categories,
  transactionsControllerUpdate: api.update
}))

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({ selectedGroup: { id: "1" } })
}))

vi.mock("@/data/bankAccounts/useBankAccounts", () => ({
  useBankAccounts: () => ({ data: [] })
}))

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 80,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 80
      }))
  })
}))

const categories = [
  {
    id: "10",
    createdAt: "2026-09-27T00:00:00.000Z",
    name: "First category",
    icon: "tag" as const,
    color: "yellow" as const,
    groupId: "1"
  },
  {
    id: "11",
    createdAt: "2026-09-27T00:00:00.000Z",
    name: "Second category",
    icon: "sparkles" as const,
    color: "teal" as const,
    groupId: "1"
  }
]

const initialTransaction: TransactionOutput = {
  id: "7",
  createdAt: "2026-09-27T00:00:00.000Z",
  description: "Test purchase",
  value: -10,
  date: "2026-09-27T00:00:00.000Z",
  installmentTotal: null,
  installmentCurrent: null,
  creditDueDate: "2026-10-05",
  observation: null,
  toBeConsideredAt: "2026-10-05",
  calculatedDate: "2026-09-27",
  billPayment: null,
  reviewMonth: "2026-06",
  cashFlowDate: "2026-09-27",
  cashFlowStatus: "scheduled",
  bankaccount: {
    id: "2",
    name: "Test card",
    type: "credit",
    dueDate: 5
  },
  category: null,
  group: { id: "1", name: "Test group" },
  import: null
}

describe("transaction detail category shortcut flow", () => {
  beforeEach(() => {
    api.categories.mockReset()
    api.categories.mockResolvedValue(categories)
    api.update.mockReset()
  })

  afterEach(cleanup)

  it("saves number-key categories through the real mutation hook and renders the bill purchase update", async () => {
    let storedTransaction = initialTransaction
    api.update.mockImplementation(async ({ requestBody }) => {
      storedTransaction = {
        ...storedTransaction,
        category:
          categories.find(
            (category) => category.id === requestBody.categoryId
          ) ?? null
      }
      return storedTransaction
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })

    function BillPurchaseDetails() {
      const { data } = useQuery({
        queryKey: ["credit-card-bills", "detail", "1", "2", "2026-10"],
        queryFn: async () => ({ transactions: [storedTransaction] })
      })

      return (
        <TransactionDetailsModal
          transaction={data?.transactions[0] ?? null}
          open
          onOpenChange={vi.fn()}
          totalTransactions={1}
          currentTransactionIndex={0}
          onNextTransaction={vi.fn()}
          onPreviousTransaction={vi.fn()}
        />
      )
    }

    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <BillPurchaseDetails />
      </QueryClientProvider>
    )
    await screen.findByRole("button", { name: "1 First category" })

    for (const [key, categoryId, label] of [
      ["1", "10", "1 First category"],
      ["2", "11", "2 Second category"],
      ["0", null, "0 Uncategorized"]
    ] as const) {
      await user.keyboard(key)

      await waitFor(() => {
        expect(api.update).toHaveBeenLastCalledWith({
          id: "7",
          requestBody: expect.objectContaining({ categoryId })
        })
        expect(screen.getByRole("button", { name: label })).toHaveAttribute(
          "aria-pressed",
          "true"
        )
      })
    }

    expect(api.update).toHaveBeenCalledTimes(3)
    queryClient.clear()
  })

  it("browses A, B, C in opening order after keyboard categorization optimistically reorders and refetches the ledger", async () => {
    let storedTransactions: TransactionOutput[] = ["A", "B", "C"].map(
      (letter, index) => ({
        ...initialTransaction,
        id: String(7 + index),
        description: `Purchase ${letter}`,
        reviewMonth: "2026-10"
      })
    )
    let resolveFirstUpdate!: () => void
    const firstUpdateReady = new Promise<void>((resolve) => {
      resolveFirstUpdate = resolve
    })
    api.update.mockImplementation(async ({ id, requestBody }) => {
      if (id === "7") await firstUpdateReady

      storedTransactions = storedTransactions.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              category:
                categories.find(
                  (category) => category.id === requestBody.categoryId
                ) ?? null
            }
          : transaction
      )
      return storedTransactions.find((transaction) => transaction.id === id)
    })
    const readTransactions = vi.fn(
      async (): Promise<QueryTransactionOutputDtoType> => ({
        data: storedTransactions,
        totalCount: storedTransactions.length
      })
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })

    function CategorizationLedger() {
      const { data, isLoading, isError } = useQuery({
        queryKey: ["transactions", 1, 50, "1"],
        queryFn: readTransactions
      })

      return (
        <TransactionsTable
          data={data?.data}
          totalCount={data?.totalCount ?? 0}
          pageIndex={0}
          pageSize={50}
          sort="category-asc"
          isLoading={isLoading}
          isError={isError}
          onUpdateTransaction={vi.fn()}
          onDeleteTransactions={vi.fn()}
        />
      )
    }

    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <CategorizationLedger />
      </QueryClientProvider>
    )
    const firstPurchase = await screen.findByText("Purchase A")
    const ledger = screen.getByRole("table")
    const ledgerOrder = () =>
      within(ledger)
        .getAllByRole("row", { hidden: true })
        .slice(1)
        .map((row) => within(row).getByText(/^Purchase [ABC]$/).textContent)

    expect(ledgerOrder()).toEqual(["Purchase A", "Purchase B", "Purchase C"])
    await user.click(firstPurchase)
    const details = within(screen.getByRole("dialog"))
    await details.findByRole("button", { name: "1 First category" })
    expect(details.getByRole("heading", { name: "Purchase A" })).toBeVisible()
    await user.keyboard("1")

    await waitFor(() => {
      expect(api.update).toHaveBeenLastCalledWith({
        id: "7",
        requestBody: expect.objectContaining({ categoryId: "10" })
      })
      expect(
        details.getByRole("button", { name: "1 First category" })
      ).toHaveAttribute("aria-pressed", "true")
      expect(ledgerOrder()).toEqual(["Purchase B", "Purchase C", "Purchase A"])
    })
    expect(storedTransactions[0].category).toBeNull()
    expect(details.getByText("1 / 3")).toBeInTheDocument()

    await act(async () => resolveFirstUpdate())
    await waitFor(() => {
      expect(readTransactions).toHaveBeenCalledTimes(2)
      expect(queryClient.isMutating()).toBe(0)
    })
    expect(storedTransactions[0].category?.id).toBe("10")
    await user.keyboard("{ArrowRight}")
    expect(details.getByRole("heading", { name: "Purchase B" })).toBeVisible()
    expect(details.getByText("2 / 3")).toBeInTheDocument()
    await user.keyboard("2")

    await waitFor(() => {
      expect(api.update).toHaveBeenLastCalledWith({
        id: "8",
        requestBody: expect.objectContaining({ categoryId: "11" })
      })
      expect(readTransactions).toHaveBeenCalledTimes(3)
      expect(queryClient.isMutating()).toBe(0)
      expect(
        details.getByRole("button", { name: "2 Second category" })
      ).toHaveAttribute("aria-pressed", "true")
      expect(ledgerOrder()).toEqual(["Purchase C", "Purchase A", "Purchase B"])
    })
    await user.keyboard("{ArrowRight}")
    expect(details.getByRole("heading", { name: "Purchase C" })).toBeVisible()
    expect(details.getByText("3 / 3")).toBeInTheDocument()
    await user.keyboard("{ArrowLeft}")
    expect(details.getByRole("heading", { name: "Purchase B" })).toBeVisible()
    expect(
      details.getByRole("button", { name: "2 Second category" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(api.update).toHaveBeenCalledTimes(2)
    queryClient.clear()
  })
})
