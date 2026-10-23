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
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"

import { TransactionDetailsModal } from "./TransactionDetailsModal"
import TransactionsList from "./TransactionsList"

const api = vi.hoisted(() => ({
  categories: vi.fn(),
  toast: vi.fn(),
  update: vi.fn()
}))

vi.mock("@/hooks/use-toast", () => ({
  toast: api.toast,
  useToast: () => ({ toast: api.toast })
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
    getTotalSize: () => count * 40,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 40
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
  flagged: false,
  cardName: null,
  cardLast4: null,
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
    institutionId: null,
    dueDate: 5
  },
  category: null,
  group: { id: "1", name: "Test group" },
  import: null
}

describe("transaction detail category shortcut flow", () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => undefined
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
  })
  beforeEach(() => {
    api.categories.mockReset()
    api.categories.mockResolvedValue(categories)
    api.update.mockReset()
    api.toast.mockReset()
  })

  afterEach(cleanup)

  it("saves number-key categories through the real mutation hook and renders the bill purchase update", async () => {
    let storedTransaction = initialTransaction
    let completeUpdate!: () => void
    api.update.mockImplementation(
      ({ requestBody }) =>
        new Promise<TransactionOutput>((resolve) => {
          completeUpdate = () => {
            storedTransaction = {
              ...storedTransaction,
              category:
                categories.find(
                  (category) => category.id === requestBody.categoryId
                ) ?? null
            }
            resolve(storedTransaction)
          }
        })
    )
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
      expect(queryClient.isMutating()).toBe(1)
      expect(
        screen.getByRole("button", { name: "1 First category" })
      ).toBeEnabled()
      expect(
        screen.getByRole("button", { name: "2 Second category" })
      ).toBeEnabled()
      expect(
        screen.getByRole("button", { name: "0 Uncategorized" })
      ).toBeEnabled()
      expect(screen.getByRole("button", { name: "Add note" })).toBeEnabled()
      if (key === "1") {
        await user.click(screen.getByRole("button", { name: "Add note" }))
        const editor = screen.getByRole("textbox", { name: "Transaction note" })
        expect(editor).toBeEnabled()
        await user.type(editor, "Draft while category saves")
        await user.click(screen.getByRole("button", { name: "Cancel" }))
      }
      expect(storedTransaction.category?.id ?? null).not.toBe(categoryId)
      expect(api.toast).not.toHaveBeenCalled()
      await act(async () => completeUpdate())
      await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    }

    expect(api.update).toHaveBeenCalledTimes(3)
    queryClient.clear()
  })

  it("rolls back a failed optimistic bill category without undoing other cached edits and notifies once", async () => {
    let storedTransactions: TransactionOutput[] = [
      { ...initialTransaction, category: categories[0] },
      { ...initialTransaction, id: "8", description: "Another purchase" }
    ]
    let rejectUpdate!: (error: Error) => void
    api.update.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectUpdate = reject
        })
    )
    let completeRefetch!: () => void
    const readBill = vi
      .fn()
      .mockImplementationOnce(async () => ({
        transactions: storedTransactions
      }))
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            completeRefetch = () =>
              resolve({ transactions: storedTransactions })
          })
      )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
    const billKey = ["credit-card-bills", "detail", "1", "2", "2026-10"]
    const ledgerKey = ["transactions", 1, 50, "1"]
    queryClient.setQueryData(ledgerKey, {
      data: storedTransactions,
      totalCount: 2
    })

    function BillPurchaseDetails() {
      const { data } = useQuery<{ transactions: TransactionOutput[] }>({
        queryKey: billKey,
        queryFn: readBill
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
    const first = await screen.findByRole("button", {
      name: "1 First category"
    })
    await waitFor(() => expect(first).toHaveAttribute("aria-pressed", "true"))
    await user.click(screen.getByRole("button", { name: "2 Second category" }))
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "2 Second category" })
      ).toHaveAttribute("aria-pressed", "true")
    )
    expect(api.update).toHaveBeenCalledTimes(1)
    expect(
      queryClient.getQueryData<QueryTransactionOutputDtoType>(ledgerKey)
        ?.data[0].category?.id
    ).toBe("11")
    expect(api.toast).not.toHaveBeenCalled()

    // A separate confirmed edit must survive this category request failing.
    storedTransactions = [
      { ...storedTransactions[0], observation: "Concurrent note" },
      { ...storedTransactions[1], category: categories[1] }
    ]
    const otherEdits = (rows: TransactionOutput[]) =>
      rows.map((row) =>
        row.id === "7"
          ? { ...row, observation: "Concurrent note" }
          : { ...row, category: categories[1] }
      )
    act(() => {
      queryClient.setQueryData<QueryTransactionOutputDtoType>(
        ledgerKey,
        (page) => page && { ...page, data: otherEdits(page.data) }
      )
      queryClient.setQueryData<{ transactions: TransactionOutput[] }>(
        billKey,
        (detail) =>
          detail && { ...detail, transactions: otherEdits(detail.transactions) }
      )
    })
    await act(async () => rejectUpdate(new Error("request failed")))
    await waitFor(() => {
      expect(readBill).toHaveBeenCalledTimes(2)
      expect(first).toHaveAttribute("aria-pressed", "true")
    })
    const ledgerRows =
      queryClient.getQueryData<QueryTransactionOutputDtoType>(ledgerKey)!.data
    const billRows = queryClient.getQueryData<{
      transactions: TransactionOutput[]
    }>(billKey)!.transactions
    for (const rows of [ledgerRows, billRows]) {
      expect(rows[0]).toMatchObject({
        category: { id: "10" },
        observation: "Concurrent note"
      })
      expect(rows[1].category?.id).toBe("11")
    }
    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledExactlyOnceWith({
        title: "Could not categorize this transaction",
        variant: "destructive"
      })
    )
    await act(async () => completeRefetch())
    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledExactlyOnceWith({
        title: "Could not categorize this transaction",
        variant: "destructive"
      })
    )
    expect(queryClient.isMutating()).toBe(0)
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
        <TransactionsList
          data={data?.data}
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
    const ledger = screen.getByRole("grid")
    const ledgerOrder = () =>
      within(ledger)
        .getAllByRole("row", { hidden: true })
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
    expect(details.getByText("1 of 3")).toBeInTheDocument()

    expect(details.getByRole("button", { name: "Next" })).toBeEnabled()
    await user.keyboard("{ArrowRight}")
    expect(details.getByRole("heading", { name: "Purchase B" })).toBeVisible()
    expect(details.getByText("2 of 3")).toBeInTheDocument()
    await user.keyboard("2")

    await waitFor(() => {
      expect(api.update).toHaveBeenLastCalledWith({
        id: "8",
        requestBody: expect.objectContaining({ categoryId: "11" })
      })
      expect(queryClient.isMutating()).toBe(1)
      expect(
        details.getByRole("button", { name: "2 Second category" })
      ).toHaveAttribute("aria-pressed", "true")
      expect(ledgerOrder()).toEqual(["Purchase C", "Purchase A", "Purchase B"])
    })
    await user.keyboard("{ArrowRight}")
    expect(details.getByRole("heading", { name: "Purchase C" })).toBeVisible()
    expect(details.getByText("3 of 3")).toBeInTheDocument()
    await user.keyboard("{ArrowLeft}")
    expect(details.getByRole("heading", { name: "Purchase B" })).toBeVisible()
    expect(
      details.getByRole("button", { name: "2 Second category" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(api.update).toHaveBeenCalledTimes(2)
    expect(storedTransactions[0].category).toBeNull()
    await act(async () => resolveFirstUpdate())
    await waitFor(() => {
      expect(readTransactions).toHaveBeenCalledTimes(2)
      expect(queryClient.isMutating()).toBe(0)
    })
    expect(storedTransactions[0].category?.id).toBe("10")
    expect(details.getByRole("heading", { name: "Purchase B" })).toBeVisible()
    expect(
      details.getByRole("button", { name: "2 Second category" })
    ).toHaveAttribute("aria-pressed", "true")
    queryClient.clear()
  })
})
