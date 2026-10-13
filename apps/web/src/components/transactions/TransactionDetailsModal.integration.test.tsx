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
  CreditCardOutput,
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
  creditCards: vi.fn(),
  toast: vi.fn(),
  update: vi.fn()
}))

vi.mock("@/hooks/use-toast", () => ({
  toast: api.toast,
  useToast: () => ({ toast: api.toast })
}))

vi.mock("@/api/generated", () => ({
  categoriesControllerFindAll: api.categories,
  creditCardsControllerFindAll: api.creditCards,
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
  creditCard: null,
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
    api.creditCards.mockReset()
    api.creditCards.mockResolvedValue([])
    api.update.mockReset()
    api.toast.mockReset()
  })

  afterEach(cleanup)

  it.each(["success", "failure"] as const)(
    "locks mouse and keyboard edits and navigation until a deferred card save settles with %s",
    async (outcome) => {
      const card: CreditCardOutput = {
        id: "70",
        accountId: "2",
        accountName: "Test card",
        groupId: "1",
        createdAt: "2026-06-01T00:00:00.000Z",
        name: "Main physical",
        last4: "0042",
        archived: false
      }
      api.creditCards.mockResolvedValue([card])
      let completeCardSave!: () => void
      const cardSaveReady = new Promise<void>((resolve) => {
        completeCardSave = resolve
      })
      let storedTransaction = initialTransaction
      api.update.mockImplementation(async ({ requestBody }) => {
        if (requestBody.creditCardId !== undefined) {
          await cardSaveReady
          if (outcome === "failure") {
            throw new Error("Synthetic rejected card assignment")
          }
          storedTransaction = { ...storedTransaction, creditCard: card }
        } else if (requestBody.categoryId !== undefined) {
          storedTransaction = {
            ...storedTransaction,
            category:
              categories.find((item) => item.id === requestBody.categoryId) ??
              null
          }
        }
        return storedTransaction
      })
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
      })
      const queryKey = ["transactions", "1", "deferred-card-save", outcome]
      const readTransactions = vi.fn(async () => ({
        data: [storedTransaction],
        totalCount: 1
      }))
      const onNext = vi.fn()
      const onPrevious = vi.fn()
      const onOpenChange = vi.fn()
      function PurchaseDetails() {
        const { data } = useQuery({ queryKey, queryFn: readTransactions })
        return (
          <TransactionDetailsModal
            transaction={data?.data[0] ?? null}
            open
            onOpenChange={onOpenChange}
            totalTransactions={3}
            currentTransactionIndex={1}
            onNextTransaction={onNext}
            onPreviousTransaction={onPrevious}
          />
        )
      }
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={client}>
          <PurchaseDetails />
        </QueryClientProvider>
      )
      const picker = await screen.findByRole("combobox", {
        name: "Change purchase card"
      })
      await waitFor(() => expect(picker).toBeEnabled())
      const firstCategory = screen.getByRole("button", {
        name: "1 First category"
      })
      const clearCategory = screen.getByRole("button", {
        name: "0 Uncategorized"
      })
      const previous = screen.getByRole("button", { name: "Previous" })
      const next = screen.getByRole("button", { name: "Next" })
      for (const button of [firstCategory, clearCategory, previous, next]) {
        expect(button).toBeEnabled()
      }
      await user.click(picker)
      await user.click(
        screen.getByRole("option", { name: "Main physical · ••0042" })
      )
      await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
      expect(client.isMutating()).toBe(1)
      expect(picker).toBeDisabled()
      for (const button of [firstCategory, clearCategory, previous, next]) {
        expect(button).toBeDisabled()
        await user.click(button)
      }
      expect(
        screen.getByRole("button", { name: "2 Second category" })
      ).toBeDisabled()
      const dialog = screen.getByRole("dialog", { name: "Test purchase" })
      act(() => dialog.focus())
      await user.keyboard("10 {ArrowLeft}{ArrowRight}{ArrowUp}{ArrowDown}")
      expect(api.update).toHaveBeenCalledTimes(1)
      expect(onNext).not.toHaveBeenCalled()
      expect(onPrevious).not.toHaveBeenCalled()
      expect(onOpenChange).not.toHaveBeenCalled()
      expect(dialog).toHaveTextContent("2 / 3")
      expect(storedTransaction.creditCard).toBeNull()
      expect(storedTransaction.category).toBeNull()
      expect(readTransactions).toHaveBeenCalledTimes(1)

      await act(async () => completeCardSave())
      await waitFor(() => {
        expect(client.isMutating()).toBe(0)
        expect(picker).toBeEnabled()
        for (const button of [firstCategory, clearCategory, previous, next]) {
          expect(button).toBeEnabled()
        }
      })
      const persistedCard = outcome === "success" ? card : null
      expect(storedTransaction.creditCard).toEqual(persistedCard)
      expect(
        client.getQueryData<QueryTransactionOutputDtoType>(queryKey)?.data[0]
          .creditCard
      ).toEqual(persistedCard)
      expect(picker).toHaveTextContent(
        outcome === "success" ? "Main physical · ••0042" : "Not identified"
      )
      if (outcome === "failure") {
        expect(api.toast).toHaveBeenCalledWith({
          title: "Could not change the purchase card",
          variant: "destructive"
        })
      }
      await user.click(firstCategory)
      await waitFor(() => {
        expect(client.isMutating()).toBe(0)
        expect(firstCategory).toHaveAttribute("aria-pressed", "true")
      })
      act(() => dialog.focus())
      await user.keyboard("0")
      await waitFor(() => {
        expect(client.isMutating()).toBe(0)
        expect(clearCategory).toHaveAttribute("aria-pressed", "true")
      })
      await user.keyboard("{ArrowLeft}{ArrowRight}")
      expect(onPrevious).toHaveBeenCalledTimes(1)
      expect(onNext).toHaveBeenCalledTimes(1)
      expect(api.update).toHaveBeenCalledTimes(3)
      expect(storedTransaction.creditCard).toEqual(persistedCard)
      client.clear()
    }
  )

  it("assigns, changes and clears purchase cards through the generated mutation, retaining persisted attribution after failure and picker Escape", async () => {
    const cards: CreditCardOutput[] = [
      {
        id: "70",
        accountId: "2",
        accountName: "Test card",
        groupId: "1",
        createdAt: "2026-06-01T00:00:00.000Z",
        name: "Main physical",
        last4: "0042",
        archived: false
      },
      {
        id: "71",
        accountId: "2",
        accountName: "Test card",
        groupId: "1",
        createdAt: "2026-06-01T00:00:00.000Z",
        name: "Online virtual",
        last4: null,
        archived: false
      }
    ]
    api.creditCards.mockResolvedValue(cards)
    let storedTransaction = initialTransaction
    api.update.mockImplementation(async ({ requestBody }) => {
      storedTransaction = {
        ...storedTransaction,
        creditCard:
          cards.find((card) => card.id === requestBody.creditCardId) ?? null
      }
      return storedTransaction
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
    const queryKey = ["transactions", "1", "card-attribution"]
    const readTransactions = vi.fn(async () => ({
      data: [storedTransaction],
      totalCount: 1
    }))
    const onOpenChange = vi.fn()
    function PurchaseDetails() {
      const { data } = useQuery({ queryKey, queryFn: readTransactions })
      return (
        <TransactionDetailsModal
          transaction={data?.data[0] ?? null}
          open
          onOpenChange={onOpenChange}
          totalTransactions={1}
          currentTransactionIndex={0}
          onNextTransaction={vi.fn()}
          onPreviousTransaction={vi.fn()}
        />
      )
    }
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={client}>
        <PurchaseDetails />
      </QueryClientProvider>
    )
    const picker = await screen.findByRole("combobox", {
      name: "Change purchase card"
    })
    await waitFor(() => expect(picker).toBeEnabled())
    expect(api.creditCards).toHaveBeenCalledWith({
      groupId: "1",
      accountId: "2",
      includeArchived: false
    })
    await user.click(picker)
    const search = screen.getByRole("combobox", { name: "Search cards" })
    await user.type(search, "0042")
    await user.keyboard("{Escape}")
    expect(
      screen.queryByRole("combobox", { name: "Search cards" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("dialog", { name: "Test purchase" })
    ).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(api.update).not.toHaveBeenCalled()
    for (const [id, label] of [
      ["70", "Main physical · ••0042"],
      ["71", "Online virtual"],
      [null, "Not identified"]
    ] as const) {
      if (id === "71") {
        api.update.mockRejectedValueOnce(
          new Error("Synthetic rejected assignment")
        )
        await user.click(picker)
        await user.click(screen.getByRole("option", { name: label }))
        await waitFor(() =>
          expect(api.toast).toHaveBeenCalledWith({
            title: "Could not change the purchase card",
            variant: "destructive"
          })
        )
        await waitFor(() => expect(client.isMutating()).toBe(0))
        expect(picker).toHaveTextContent("Main physical · ••0042")
        expect(
          client.getQueryData<QueryTransactionOutputDtoType>(queryKey)?.data[0]
            .creditCard?.id
        ).toBe("70")
      }
      await user.click(picker)
      await user.click(screen.getByRole("option", { name: label }))
      await waitFor(() => {
        expect(picker).toHaveTextContent(label)
        expect(client.isMutating()).toBe(0)
      })
      const patch = api.update.mock.lastCall![0]
      expect(patch.id).toBe("7")
      expect(
        Object.fromEntries(
          Object.entries(patch.requestBody).filter(
            ([, value]) => value !== undefined
          )
        )
      ).toEqual({ creditCardId: id })
      expect(storedTransaction.creditCard?.id ?? null).toBe(id)
      expect(
        client.getQueryData<QueryTransactionOutputDtoType>(queryKey)?.data[0]
          .creditCard?.id ?? null
      ).toBe(id)
    }
    expect(storedTransaction).toEqual({
      ...initialTransaction,
      creditCard: null
    })
    expect(api.update).toHaveBeenCalledTimes(4)
    expect(readTransactions).toHaveBeenCalledTimes(5)
    client.clear()
  })

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
