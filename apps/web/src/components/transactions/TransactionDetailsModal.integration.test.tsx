// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { TransactionOutput } from "@fina/types"
import {
  QueryClient,
  QueryClientProvider,
  useQuery
} from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TransactionDetailsModal } from "./TransactionDetailsModal"

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
})
