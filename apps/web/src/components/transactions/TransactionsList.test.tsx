// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react"
import type {
  CreditCardOutput,
  TransactionOutput as Transaction
} from "@fina/types"
import userEvent from "@testing-library/user-event"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"

import TransactionsList, {
  type TransactionsListProps
} from "./TransactionsList"
import { DEFAULT_TRANSACTION_DISPLAY_PROPERTIES } from "./transactionDisplay"

const virtualizerMock = vi.hoisted(() => {
  const state: {
    count: number
    indexes: number[] | null
    rowHeight: number
    getScrollElement: () => HTMLElement | null
  } = {
    count: 0,
    indexes: null,
    rowHeight: 40,
    getScrollElement: () => null
  }

  return {
    state,
    virtualizer: {
      scrollToIndex: vi.fn(),
      getTotalSize: () => state.count * state.rowHeight,
      getVirtualItems: () =>
        (
          state.indexes ??
          Array.from({ length: state.count }, (_, index) => index)
        ).map((index) => ({
          index,
          key: index,
          start: index * state.rowHeight
        }))
    }
  }
})

const activeGroup = vi.hoisted(() => ({ id: "1" }))
const toastMock = vi.hoisted(() => vi.fn())
const cardFixtures = vi.hoisted(() => ({ data: [] as CreditCardOutput[] }))

vi.mock("@/data/creditCards/useCreditCards", () => ({
  useCreditCards: ({ accountId }: { accountId?: string }) => ({
    data: cardFixtures.data.filter((card) => card.accountId === accountId),
    isLoading: false,
    isError: false
  })
}))

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({ selectedGroup: { id: activeGroup.id } })
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

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock })
}))

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
    getScrollElement
  }: {
    count: number
    estimateSize: () => number
    getScrollElement: () => HTMLElement | null
  }) => {
    virtualizerMock.state.count = count
    virtualizerMock.state.rowHeight = estimateSize()
    virtualizerMock.state.getScrollElement = getScrollElement
    return virtualizerMock.virtualizer
  }
}))

vi.mock("./TransactionDetailsModal", () => ({
  TransactionDetailsModal: ({
    transaction,
    open,
    onOpenChange,
    onNextTransaction,
    onPreviousTransaction,
    currentTransactionIndex,
    totalTransactions
  }: {
    transaction: Transaction | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onNextTransaction: () => void
    onPreviousTransaction: () => void
    currentTransactionIndex: number
    totalTransactions: number
  }) =>
    open ? (
      <div role="dialog" aria-label="Transaction details">
        <span data-testid="modal-description">{transaction?.description}</span>
        <span data-testid="modal-category">{transaction?.category?.name}</span>
        <span data-testid="modal-position">
          {currentTransactionIndex + 1} / {totalTransactions}
        </span>
        <button
          type="button"
          onClick={onPreviousTransaction}
          disabled={currentTransactionIndex <= 0}
        >
          Previous transaction
        </button>
        <button
          type="button"
          onClick={onNextTransaction}
          disabled={currentTransactionIndex >= totalTransactions - 1}
        >
          Next transaction
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close details
        </button>
      </div>
    ) : null
}))

const transaction = (id: string, description: string): Transaction => ({
  id,
  creditCard: null,
  createdAt: "2026-09-27T00:00:00.000Z",
  description,
  value: -10,
  date: "2026-09-27T00:00:00.000Z",
  installmentTotal: null,
  installmentCurrent: null,
  creditDueDate: null,
  observation: null,
  toBeConsideredAt: null,
  calculatedDate: "2026-09-27",
  billPayment: null,
  reviewMonth: "2026-06",
  cashFlowDate: "2026-09-27",
  cashFlowStatus: "scheduled",
  bankaccount: {
    id: "1",
    name: "Checking",
    type: "checkout",
    institutionId: null,
    dueDate: null
  },
  category: null,
  group: { id: "1", name: "My finances" },
  import: null
})

function creditTransaction(
  id: string,
  description: string,
  accountId = "20"
): Transaction {
  return {
    ...transaction(id, description),
    bankaccount: {
      id: accountId,
      name: "Family credit",
      type: "credit",
      institutionId: null,
      dueDate: 10
    }
  }
}

function metadataSlots(row: HTMLElement): string[] {
  return Array.from(
    row.querySelectorAll<HTMLElement>("[data-metadata-slot]")
  ).map((slot) => slot.dataset.metadataSlot!)
}

function expectEmptyMetadataSlot(row: HTMLElement, id: string): void {
  const slot = row.querySelector(`[data-metadata-slot="${id}"]`)
  expect(slot).not.toBeNull()
  expect(slot).toHaveAttribute("data-empty", "true")
  expect(slot).toHaveAttribute("aria-hidden", "true")
  expect(slot).toBeEmptyDOMElement()
  expect(slot).not.toHaveAttribute("tabindex")
  expect(slot).not.toHaveAttribute("aria-label")
}

describe("TransactionsList", () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => undefined
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
  })

  beforeEach(() => {
    cardFixtures.data = []
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      }
    )
  })

  it("hides and restores purchase card metadata without changing compact row geometry or ordering", () => {
    const identified = creditTransaction("a", "Alpha purchase")
    identified.creditCard = {
      id: "70",
      accountId: "20",
      name: "Old physical",
      last4: "0042",
      archived: true
    }
    const props: TransactionsListProps = {
      data: [creditTransaction("b", "Bravo purchase"), identified],
      sort: "description-asc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const view = render(<TransactionsList {...props} />)
    expect(screen.getAllByTestId("transaction-card")).toHaveLength(2)
    expect(screen.getByText("Old physical · ••0042")).toBeInTheDocument()
    expect(screen.getByText("Archived")).toBeInTheDocument()
    expect(screen.getByText("Not identified")).toBeInTheDocument()
    view.rerender(
      <TransactionsList
        {...props}
        displayProperties={{
          ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
          card: false
        }}
      />
    )
    expect(screen.queryByTestId("transaction-card")).not.toBeInTheDocument()
    expect(screen.queryByText("Old physical · ••0042")).not.toBeInTheDocument()
    const rows = screen.getAllByRole("row")
    expect(
      rows.map((row) =>
        within(row)
          .getByRole("button", { name: /Open transaction:/ })
          .getAttribute("aria-label")
      )
    ).toEqual([
      "Open transaction: Alpha purchase",
      "Open transaction: Bravo purchase"
    ])
    for (const row of rows) expect(row).toHaveStyle({ height: "40px" })
    expect(document.querySelectorAll('[data-column="value"]')).toHaveLength(2)
    view.rerender(<TransactionsList {...props} />)
    expect(screen.getAllByTestId("transaction-card")).toHaveLength(2)
    expect(screen.getByText("Old physical · ••0042")).toBeInTheDocument()
  })

  it("keeps the installment track stable across changed result lengths and entirely blank results until hidden", () => {
    const base = transaction("same", "Installment fixture")
    const props: TransactionsListProps = {
      data: [{ ...base, installmentCurrent: "1", installmentTotal: 2 }],
      sort: "date-desc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const view = render(<TransactionsList {...props} />)
    const grid = screen.getByRole("grid")
    const layoutElement = grid.parentElement!
    const baseColumns = layoutElement.style.getPropertyValue(
      "--transaction-metadata-base-columns"
    )
    const desktopColumns = layoutElement.style.getPropertyValue(
      "--transaction-metadata-desktop-columns"
    )
    const minimumWidth = grid.style.minWidth
    expect(baseColumns).toContain("64px")
    expect(screen.getByText("1/2")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox"))
    view.rerender(
      <TransactionsList
        {...props}
        data={[{ ...base, installmentCurrent: "11", installmentTotal: 123 }]}
      />
    )
    expect(screen.getByText("11/123")).toBeInTheDocument()
    expect(
      layoutElement.style.getPropertyValue(
        "--transaction-metadata-base-columns"
      )
    ).toBe(baseColumns)
    expect(
      layoutElement.style.getPropertyValue(
        "--transaction-metadata-desktop-columns"
      )
    ).toBe(desktopColumns)
    expect(grid.style.minWidth).toBe(minimumWidth)

    view.rerender(<TransactionsList {...props} data={[base]} />)
    const row = screen.getByRole("row")
    expectEmptyMetadataSlot(row, "installment")
    expect(
      layoutElement.style.getPropertyValue(
        "--transaction-metadata-base-columns"
      )
    ).toBe(baseColumns)
    expect(
      layoutElement.style.getPropertyValue(
        "--transaction-metadata-desktop-columns"
      )
    ).toBe(desktopColumns)
    expect(grid.style.minWidth).toBe(minimumWidth)
    expect(row).toHaveAttribute("aria-selected", "true")
    expect(
      within(row).getByRole("combobox", {
        name: "Change category for Installment fixture"
      })
    ).toBeEnabled()
    view.rerender(
      <TransactionsList
        {...props}
        data={[base]}
        displayProperties={{
          ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
          installment: false
        }}
      />
    )
    expect(row.querySelector('[data-metadata-slot="installment"]')).toBeNull()
    expect(
      layoutElement.style.getPropertyValue(
        "--transaction-metadata-base-columns"
      )
    ).not.toContain("64px")
    expect(row).toHaveAttribute("aria-selected", "true")
  })

  it("retains the same enabled metadata tracks across mixed rows without inventing values or controls in blank slots", () => {
    const rich: Transaction = {
      ...creditTransaction("a", "Alpha purchase"),
      creditCard: {
        id: "70",
        accountId: "20",
        name: "Old physical",
        last4: "0042",
        archived: true
      },
      installmentCurrent: "1",
      installmentTotal: 123,
      import: { id: "31", fileName: "alignment-fixture.csv" }
    }
    const missing: Transaction = {
      ...transaction("c", "Charlie purchase"),
      bankaccount: null
    }
    const reconciled: Transaction = {
      ...transaction("e", "Echo payment"),
      billPayment: { creditAccountId: "20", billMonth: "2026-06" }
    }
    const props: TransactionsListProps = {
      data: [
        rich,
        transaction("b", "Bravo purchase"),
        missing,
        creditTransaction("d", "Delta purchase"),
        reconciled
      ],
      sort: "description-asc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const view = render(<TransactionsList {...props} />)
    const rows = screen.getAllByRole("row")
    const enabledSlots = [
      "description",
      "account-icon",
      "import",
      "status",
      "account",
      "card",
      "installment",
      "category"
    ]
    for (const row of rows) {
      expect(metadataSlots(row)).toEqual(enabledSlots)
      expect(within(row).getAllByRole("gridcell")).toHaveLength(1)
      expect(row).toHaveStyle({ height: "40px" })
      expect(
        within(row).getByRole("combobox", { name: /Change category for/ })
      ).toBeEnabled()
    }
    expect(
      within(rows[0]).getByText("Old physical · ••0042")
    ).toBeInTheDocument()
    expect(within(rows[0]).getByText("Archived")).toBeInTheDocument()
    expect(within(rows[0]).getByText("1/123")).toBeInTheDocument()
    expect(
      within(rows[0]).getByRole("img", {
        name: "Imported from alignment-fixture.csv"
      })
    ).toBeInTheDocument()
    for (const id of ["card", "installment", "import", "status"])
      expectEmptyMetadataSlot(rows[1], id)
    for (const id of [
      "account-icon",
      "account",
      "card",
      "installment",
      "import",
      "status"
    ])
      expectEmptyMetadataSlot(rows[2], id)
    expect(within(rows[2]).queryByRole("img")).not.toBeInTheDocument()
    expect(within(rows[3]).getByText("Not identified")).toBeInTheDocument()
    expect(
      rows[3].querySelector('[data-metadata-slot="card"]')
    ).not.toHaveAttribute("data-empty", "true")
    expect(within(rows[4]).getByText("Reconciled")).toBeInTheDocument()
    expectEmptyMetadataSlot(rows[4], "card")
    fireEvent.click(within(rows[1]).getByRole("checkbox"))
    expect(rows[1]).toHaveAttribute("aria-selected", "true")

    view.rerender(
      <TransactionsList
        {...props}
        displayProperties={{
          ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
          account: false,
          card: false,
          installment: false,
          sourceImport: false
        }}
      />
    )
    for (const row of screen.getAllByRole("row"))
      expect(metadataSlots(row)).toEqual(["description", "status", "category"])
    expect(screen.queryByTestId("transaction-card")).not.toBeInTheDocument()
    expect(screen.queryByText("1/123")).not.toBeInTheDocument()
    expect(screen.getByText("Reconciled")).toBeInTheDocument()
    expect(rows[1]).toHaveAttribute("aria-selected", "true")
    virtualizerMock.state.indexes = [2]
    view.rerender(<TransactionsList {...props} />)
    const virtualRows = screen.getAllByRole("row")
    expect(virtualRows).toHaveLength(1)
    expect(metadataSlots(virtualRows[0])).toEqual(enabledSlots)
    expectEmptyMetadataSlot(virtualRows[0], "installment")
    expectEmptyMetadataSlot(virtualRows[0], "card")
    expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "5")
    virtualizerMock.state.indexes = null
    view.rerender(<TransactionsList {...props} />)
    for (const row of screen.getAllByRole("row"))
      expect(metadataSlots(row)).toEqual(enabledSlots)
    expect(screen.getByText("Old physical · ••0042")).toBeInTheDocument()
    expect(rows[1]).toHaveAttribute("aria-selected", "true")
  })

  it.each([
    {
      reason: "a checking account",
      second: transaction("b", "Bravo purchase")
    },
    {
      reason: "another credit account",
      second: creditTransaction("b", "Bravo purchase", "21")
    }
  ])(
    "disables bulk card assignment when selected purchases include $reason",
    async ({ second }) => {
      const user = userEvent.setup()
      const onUpdateTransaction = vi.fn()
      render(
        <TransactionsList
          data={[creditTransaction("a", "Alpha purchase"), second]}
          sort="description-asc"
          isLoading={false}
          isError={false}
          onUpdateTransaction={onUpdateTransaction}
          onDeleteTransactions={vi.fn()}
        />
      )
      await user.click(screen.getAllByRole("checkbox")[0])
      expect(
        screen.getByRole("button", { name: "Card for selected purchases" })
      ).toBeEnabled()
      await user.click(screen.getAllByRole("checkbox")[1])
      expect(
        screen.getByRole("button", { name: "Card for selected purchases" })
      ).toBeDisabled()
      expect(screen.getByRole("status")).toHaveTextContent("2 selected")
      expect(onUpdateTransaction).not.toHaveBeenCalled()
    }
  )

  it("assigns only same-account selected purchases and retains the editor and selection after a busy partial failure", async () => {
    const card: CreditCardOutput = {
      id: "70",
      accountId: "20",
      accountName: "Family credit",
      groupId: "1",
      createdAt: "2026-06-01T00:00:00.000Z",
      name: "Main physical",
      last4: "0042",
      archived: false
    }
    cardFixtures.data = [card]
    let resolveUpdate!: () => void
    const pending = new Promise<void>((resolve) => {
      resolveUpdate = resolve
    })
    let rejectSecond = true
    const onUpdateTransaction = vi.fn(async (id: string) => {
      if (id === "a") await pending
      if (id === "b" && rejectSecond)
        throw new Error("Synthetic rejected assignment")
    })
    const user = userEvent.setup()
    render(
      <TransactionsList
        data={[
          creditTransaction("a", "Alpha purchase"),
          creditTransaction("b", "Bravo purchase"),
          creditTransaction("c", "Charlie purchase")
        ]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={onUpdateTransaction}
        onDeleteTransactions={vi.fn()}
      />
    )
    const rows = screen.getAllByRole("row")
    await user.click(within(rows[0]).getByRole("checkbox"))
    await user.click(within(rows[1]).getByRole("checkbox"))
    await user.click(
      screen.getByRole("button", { name: "Card for selected purchases" })
    )
    await user.click(
      screen.getByRole("option", { name: "Main physical · ••0042" })
    )
    await waitFor(() => expect(onUpdateTransaction).toHaveBeenCalledTimes(2))
    expect(
      screen.getByRole("combobox", { name: "Search cards" })
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "Unselect all" })).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Category for selected transactions" })
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled()
    for (const row of rows) {
      expect(within(row).getByRole("checkbox")).toBeDisabled()
      expect(
        within(row).getByRole("button", { name: /Open transaction:/ })
      ).toBeDisabled()
    }
    await act(async () => resolveUpdate())
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: "Could not assign every selected purchase",
        description: "1 updated; 1 failed. You can retry the selection.",
        variant: "destructive"
      })
    )
    expect(
      screen.getByRole("dialog", { name: "Card for selected purchases" })
    ).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Search cards" })).toBeEnabled()
    expect(screen.getByRole("status")).toHaveTextContent("2 selected")
    expect(within(rows[0]).getByRole("checkbox")).toBeChecked()
    expect(within(rows[1]).getByRole("checkbox")).toBeChecked()
    expect(within(rows[2]).getByRole("checkbox")).not.toBeChecked()
    expect(onUpdateTransaction).toHaveBeenCalledWith("a", { creditCard: card })
    expect(onUpdateTransaction).toHaveBeenCalledWith("b", { creditCard: card })
    expect(onUpdateTransaction).not.toHaveBeenCalledWith("c", expect.anything())
    rejectSecond = false
    await user.click(screen.getByRole("option", { name: "Not identified" }))
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Card for selected purchases" })
      ).not.toBeInTheDocument()
    )
    expect(onUpdateTransaction).toHaveBeenCalledTimes(4)
    expect(onUpdateTransaction).toHaveBeenCalledWith("a", { creditCard: null })
    expect(onUpdateTransaction).toHaveBeenCalledWith("b", { creditCard: null })
    expect(screen.getByRole("status")).toHaveTextContent("2 selected")
  })

  afterEach(() => {
    activeGroup.id = "1"
    virtualizerMock.state.indexes = null
    cleanup()
    vi.unstubAllGlobals()
    toastMock.mockClear()
  })

  it("shows and sorts original calendar dates in monthly review, including missing dates", () => {
    render(
      <TransactionsList
        data={[
          {
            ...transaction("earlier", "Earlier purchase"),
            date: "2026-05-12T00:00:00.000Z"
          },
          {
            ...transaction("later", "Later purchase"),
            date: "2026-07-02T00:00:00.000Z"
          },
          { ...transaction("undated", "Undated purchase"), date: null }
        ]}
        sort="date-desc"
        dateBasis="monthly-review"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )

    const grid = screen.getByRole("grid", { name: "Transactions" })
    expect(grid).toHaveAttribute("aria-rowcount", "3")
    expect(grid).toHaveAttribute("aria-colcount", "1")
    expect(grid).toHaveAttribute("aria-multiselectable", "true")
    expect(document.querySelector("table, tbody, tr, td, th")).toBeNull()
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument()
    const rows = screen.getAllByRole("row")
    for (const [index, row] of rows.entries()) {
      expect(row).toHaveAttribute("aria-rowindex", String(index + 1))
      expect(within(row).getAllByRole("gridcell")).toHaveLength(1)
    }
    expect(within(rows[0]).getByText("Later purchase")).toBeInTheDocument()
    expect(
      within(rows[0]).getByRole("gridcell", { name: /Date: 02 Jul 2026/ })
    ).toBeInTheDocument()
    expect(
      within(rows[1]).getByRole("gridcell", { name: /Date: 12 May 2026/ })
    ).toBeInTheDocument()
    expect(
      within(rows[2]).getByRole("gridcell", { name: /Date: —/ })
    ).toBeInTheDocument()
  })

  it("keeps the ledger mounted while browsing transactions in the modal", () => {
    render(
      <TransactionsList
        data={[
          transaction("1", "First transaction"),
          transaction("2", "Second transaction")
        ]}
        sort="date-desc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )

    const firstLedgerRow = document.querySelector("[role=row]")
    expect(firstLedgerRow).not.toBeNull()
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open transaction: First transaction"
      })
    )
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "First transaction"
    )

    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))

    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Second transaction"
    )
    expect(document.querySelector("[role=row]")).toBe(firstLedgerRow)
  })

  it("keeps the same transaction open when refreshed rows change order", () => {
    const first = transaction("1", "First transaction")
    const second = transaction("2", "Second transaction")
    const props: TransactionsListProps = {
      data: [first, second],
      sort: "date-desc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }

    const { rerender } = render(<TransactionsList {...props} />)
    const firstLedgerRow = document.querySelector("[role=row]")
    expect(firstLedgerRow).not.toBeNull()
    fireEvent.click(firstLedgerRow!)
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "First transaction"
    )

    rerender(<TransactionsList {...props} data={[second, first]} />)

    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "First transaction"
    )
  })

  it("keeps the opening navigation order while category edits reorder the ledger", () => {
    const categorizedTransaction = (id: string, name: string): Transaction => ({
      ...transaction(id, `Transaction ${id}`),
      category: {
        id: `category-${id}`,
        name,
        icon: "shopping-cart",
        color: "lime"
      }
    })
    const first = categorizedTransaction("a", "Alpha")
    const second = categorizedTransaction("b", "Bravo")
    const third = categorizedTransaction("c", "Charlie")
    const props: TransactionsListProps = {
      data: [first, second, third],
      sort: "category-asc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(<TransactionsList {...props} />)
    fireEvent.click(screen.getByText("Transaction a").closest("[role=row]")!)

    const updatedFirst = categorizedTransaction("a", "Zulu")
    rerender(
      <TransactionsList {...props} data={[second, third, updatedFirst]} />
    )
    expect(screen.getByTestId("modal-category")).toHaveTextContent("Zulu")
    expect(screen.getByTestId("modal-position")).toHaveTextContent("1 / 3")
    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Transaction b"
    )

    const updatedSecond = categorizedTransaction("b", "Yankee")
    rerender(
      <TransactionsList
        {...props}
        data={[third, updatedSecond, updatedFirst]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Transaction c"
    )
    expect(screen.getByTestId("modal-position")).toHaveTextContent("3 / 3")
    expect(
      screen.getByRole("button", { name: "Next transaction" })
    ).toBeDisabled()
    fireEvent.click(
      screen.getByRole("button", { name: "Previous transaction" })
    )
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Transaction b"
    )
    expect(screen.getByTestId("modal-category")).toHaveTextContent("Yankee")

    fireEvent.click(screen.getByRole("button", { name: "Close details" }))
    fireEvent.click(screen.getByText("Transaction c").closest("[role=row]")!)
    expect(screen.getByTestId("modal-position")).toHaveTextContent("1 / 3")
    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Transaction b"
    )
    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Transaction a"
    )
  })

  it("skips removed rows and waits until reopening to include newly added rows", () => {
    const first = transaction("a", "First transaction")
    const second = transaction("b", "Second transaction")
    const third = transaction("c", "Third transaction")
    const added = transaction("d", "Added transaction")
    const props: TransactionsListProps = {
      data: [first, second, third],
      sort: "description-asc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(<TransactionsList {...props} />)
    fireEvent.click(
      screen.getByText("First transaction").closest("[role=row]")!
    )
    rerender(<TransactionsList {...props} data={[added, first, third]} />)
    expect(screen.getByTestId("modal-position")).toHaveTextContent("1 / 2")
    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Third transaction"
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Previous transaction" })
    )
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "First transaction"
    )
    expect(
      screen.getByRole("button", { name: "Previous transaction" })
    ).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Close details" }))
    fireEvent.click(
      screen.getByText("Added transaction").closest("[role=row]")!
    )
    expect(screen.getByTestId("modal-position")).toHaveTextContent("1 / 3")
  })

  it("ends the details session when switching groups", () => {
    const firstGroupTransaction = transaction("a", "First group purchase")
    const secondGroupTransaction: Transaction = {
      ...transaction("b", "Second group purchase"),
      group: { id: "2", name: "Second group" }
    }
    const props: TransactionsListProps = {
      data: [firstGroupTransaction],
      sort: "date-desc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(<TransactionsList {...props} />)
    fireEvent.click(
      screen.getByText("First group purchase").closest("[role=row]")!
    )
    expect(screen.getByRole("dialog")).toHaveTextContent("First group purchase")

    activeGroup.id = "2"
    rerender(<TransactionsList {...props} data={[secondGroupTransaction]} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    activeGroup.id = "1"
    rerender(<TransactionsList {...props} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByText("First group purchase").closest("[role=row]")!
    )
    expect(screen.getByRole("dialog")).toHaveTextContent("First group purchase")
  })

  it("renders the latest virtual range when the stable virtualizer changes", () => {
    const props: TransactionsListProps = {
      data: [
        transaction("1", "First transaction"),
        transaction("2", "Second transaction")
      ],
      totalCount: 25,
      sort: "date-desc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    virtualizerMock.state.indexes = [0]

    const { rerender } = render(<TransactionsList {...props} />)
    expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "25")
    expect(screen.getByRole("row")).toHaveAttribute("aria-rowindex", "1")
    expect(screen.getByText("First transaction")).toBeInTheDocument()
    expect(screen.queryByText("Second transaction")).not.toBeInTheDocument()

    virtualizerMock.state.indexes = [1]
    rerender(<TransactionsList {...props} />)

    expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "25")
    expect(screen.getByRole("row")).toHaveAttribute("aria-rowindex", "2")
    expect(screen.queryByText("First transaction")).not.toBeInTheDocument()
    expect(screen.getByText("Second transaction")).toBeInTheDocument()
  })

  it("keeps missing purchase dates and unavailable amounts distinct from zero", () => {
    render(
      <TransactionsList
        data={[
          {
            ...transaction("missing", "Missing amount"),
            date: null,
            value: null
          },
          { ...transaction("zero", "Zero amount"), value: 0 }
        ]}
        sort="description-asc"
        dateBasis="purchase-date"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )
    const missing = screen
      .getByRole("button", { name: "Open transaction: Missing amount" })
      .closest("[role=row]")!
    expect(
      within(missing as HTMLElement).getByRole("gridcell", {
        name: /Purchase date: —/
      })
    ).toHaveTextContent("—")
    expect(
      within(missing as HTMLElement).getByRole("gridcell", {
        name: /Value: unavailable/
      })
    ).toHaveTextContent("—")
    const zero = screen
      .getByRole("button", { name: "Open transaction: Zero amount" })
      .closest("[role=row]")!
    expect(
      within(zero as HTMLElement).getByRole("gridcell", {
        name: /Value: R\$\s*0,00/
      })
    ).toHaveTextContent(/R\$\s*0,00/)
  })

  it("bounds standalone ledgers and gives the virtualizer matching row and scroll-container geometry", () => {
    const props: TransactionsListProps = {
      data: [
        transaction("a", "Alpha purchase"),
        transaction("b", "Bravo purchase")
      ],
      sort: "description-asc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(<TransactionsList {...props} />)
    const scrollContainer = screen.getByRole("region", {
      name: "Transaction list"
    })
    expect(scrollContainer).toHaveClass("max-h-[78svh]")
    expect(virtualizerMock.state.getScrollElement()).toBe(scrollContainer)
    expect(virtualizerMock.state.rowHeight).toBe(40)
    expect(
      screen
        .getAllByRole("row")
        .every(
          (row) => row.style.height === `${virtualizerMock.state.rowHeight}px`
        )
    ).toBe(true)
    rerender(<TransactionsList {...props} fillAvailableSpace />)
    expect(scrollContainer).not.toHaveClass("max-h-[78svh]")
    expect(virtualizerMock.state.getScrollElement()).toBe(scrollContainer)
  })

  it("renders an editable category chip for an inline credit-card transaction", () => {
    const creditTransaction: Transaction = {
      ...transaction("credit-1", "Card purchase"),
      bankaccount: {
        id: "credit-account",
        name: "Main card",
        type: "credit",
        institutionId: "nubank",
        dueDate: 5
      },
      category: {
        id: "category-1",
        name: "Groceries",
        icon: "shopping-cart",
        color: "lime"
      }
    }

    render(
      <TransactionsList
        data={[creditTransaction]}
        sort="date-desc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )

    expect(
      screen.getByRole("combobox", {
        name: "Change category for Card purchase"
      })
    ).toHaveTextContent("Groceries")
    const row = screen.getByText("Card purchase").closest("[role=row]")
    expect(
      row?.querySelector('[data-institution-id="nubank"] img')
    ).not.toBeNull()
    expect(row).toHaveClass("bg-fina-surface")
    expect(row).not.toHaveClass("bg-fina-sky")
    expect(row).toHaveStyle({ height: "40px" })
  })

  it("updates a saved bank logo independently of the account's custom name", () => {
    const purchase: Transaction = {
      ...transaction("institution", "Institution fixture purchase"),
      bankaccount: {
        id: "custom-account",
        name: "Household account",
        type: "checkout",
        institutionId: "inter",
        dueDate: null
      }
    }
    const props: TransactionsListProps = {
      data: [purchase],
      sort: "date-desc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(<TransactionsList {...props} />)
    const metadata = screen.getByRole("img", {
      name: "Checking account: Household account"
    })
    expect(
      metadata.querySelector('[data-institution-id="inter"] img')
    ).not.toBeNull()
    rerender(
      <TransactionsList
        {...props}
        data={[
          {
            ...purchase,
            bankaccount: { ...purchase.bankaccount!, institutionId: "itau" }
          }
        ]}
      />
    )
    expect(metadata.querySelector('[data-institution-id="inter"]')).toBeNull()
    expect(
      metadata.querySelector('[data-institution-id="itau"] img')
    ).not.toBeNull()
    expect(
      screen.getByRole("img", { name: "Checking account: Household account" })
    ).toBe(metadata)
  })

  it("hides optional properties without changing row order or details, and restores category editing", async () => {
    const user = userEvent.setup()
    const first: Transaction = {
      ...transaction("a", "Alpha purchase"),
      installmentCurrent: "2",
      installmentTotal: 6,
      import: { id: "import-1", fileName: "fixture.csv" },
      category: {
        id: "category-1",
        name: "Groceries",
        icon: "shopping-cart",
        color: "lime"
      }
    }
    const onUpdateTransaction = vi.fn().mockResolvedValue(undefined)
    const props: TransactionsListProps = {
      data: [transaction("b", "Bravo purchase"), first],
      sort: "description-asc",
      isLoading: false,
      isError: false,
      onUpdateTransaction,
      onDeleteTransactions: vi.fn(),
      displayProperties: DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
    }
    const { rerender } = render(<TransactionsList {...props} />)
    expect(
      screen.getByRole("img", { name: "Imported from fixture.csv" })
    ).toBeInTheDocument()
    expect(screen.getByText("2/6")).toBeInTheDocument()

    rerender(
      <TransactionsList
        {...props}
        displayProperties={{
          date: false,
          account: false,
          category: false,
          installment: false,
          value: false,
          sourceImport: false,
          card: false
        }}
      />
    )
    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText("Alpha purchase")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Bravo purchase")).toBeInTheDocument()
    expect(document.querySelector('[data-column="date"]')).toBeNull()
    expect(document.querySelector('[data-column="value"]')).toBeNull()
    expect(
      screen.queryByRole("img", { name: "Checking account: Checking" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("img", { name: "Imported from fixture.csv" })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Checking")).not.toBeInTheDocument()
    expect(screen.queryByText("2/6")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    fireEvent.click(rows[0])
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Alpha purchase"
    )
    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Bravo purchase"
    )
    fireEvent.click(screen.getByRole("button", { name: "Close details" }))

    rerender(<TransactionsList {...props} />)
    expect(document.querySelector('[data-column="date"]')).not.toBeNull()
    expect(document.querySelector('[data-column="value"]')).not.toBeNull()
    expect(
      screen.getAllByRole("img", { name: "Checking account: Checking" })
    ).toHaveLength(2)
    expect(
      screen.getByRole("img", { name: "Imported from fixture.csv" })
    ).toBeInTheDocument()
    expect(screen.getByText("2/6")).toBeInTheDocument()
    await user.click(
      screen.getByRole("combobox", {
        name: "Change category for Alpha purchase"
      })
    )
    await user.click(
      await screen.findByRole("option", { name: "Uncategorized" })
    )
    expect(onUpdateTransaction).toHaveBeenCalledWith("a", { category: null })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("selects on command-click without opening transaction details", () => {
    render(
      <TransactionsList
        data={[transaction("1", "Command-selected transaction")]}
        sort="date-desc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )

    const row = document.querySelector("[role=row]")
    expect(row).not.toBeNull()
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open transaction: Command-selected transaction"
      }),
      { metaKey: true }
    )

    expect(row).toHaveAttribute("aria-selected", "true")
    expect(row).toHaveClass("bg-fina-violet/10")
    expect(screen.getByText("1 selected")).toBeInTheDocument()
    expect(
      screen.queryByRole("dialog", { name: "Transaction details" })
    ).not.toBeInTheDocument()
  })

  it("selects and deselects multiple rows through their checkboxes without opening details", async () => {
    const user = userEvent.setup()
    render(
      <TransactionsList
        data={[
          transaction("a", "Alpha purchase"),
          transaction("b", "Bravo purchase")
        ]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )
    const rows = screen.getAllByRole("row")
    const firstCheckbox = within(rows[0]).getByRole("checkbox")
    const secondCheckbox = within(rows[1]).getByRole("checkbox")
    expect(firstCheckbox).not.toBeChecked()
    expect(secondCheckbox).not.toBeChecked()

    await user.hover(rows[0])
    await user.click(firstCheckbox)
    await user.hover(rows[1])
    await user.click(secondCheckbox)

    expect(firstCheckbox).toBeChecked()
    expect(secondCheckbox).toBeChecked()
    expect(rows[0]).toHaveAttribute("aria-selected", "true")
    expect(rows[1]).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("status")).toHaveTextContent("2 selected")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.click(firstCheckbox)
    expect(firstCheckbox).not.toBeChecked()
    expect(secondCheckbox).toBeChecked()
    expect(screen.getByRole("status")).toHaveTextContent("1 selected")
    await user.click(secondCheckbox)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("extends checkbox selection with Shift without modifier-click double toggles", () => {
    render(
      <TransactionsList
        data={[
          transaction("a", "Alpha purchase"),
          transaction("b", "Bravo purchase"),
          transaction("c", "Charlie purchase")
        ]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )
    const rows = screen.getAllByRole("row")
    fireEvent.click(within(rows[0]).getByRole("checkbox"), { metaKey: true })
    expect(within(rows[0]).getByRole("checkbox")).toBeChecked()
    fireEvent.click(within(rows[2]).getByRole("checkbox"), { shiftKey: true })
    expect(screen.getByRole("status")).toHaveTextContent("3 selected")
    for (const row of rows) {
      expect(within(row).getByRole("checkbox")).toBeChecked()
      expect(row).toHaveAttribute("aria-selected", "true")
    }
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("summarizes only selected loaded amounts and distinguishes unavailable values from zero", () => {
    render(
      <TransactionsList
        data={[
          transaction("expense", "Expense"),
          { ...transaction("income", "Income"), value: 25 },
          { ...transaction("missing", "Missing amount"), value: null },
          { ...transaction("zero", "Zero amount"), value: 0 }
        ]}
        totalCount={100}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )
    fireEvent.click(screen.getAllByRole("checkbox")[0])
    fireEvent.click(screen.getByRole("button", { name: "Select all" }))

    const selectionBar = screen.getByRole("status")
    expect(selectionBar).toHaveTextContent("4 selected")
    expect(selectionBar).toHaveTextContent(/R\$\s*15,00/)
    expect(selectionBar).toHaveTextContent("1 without an amount")
    expect(screen.getByRole("button", { name: "Select all" })).toBeDisabled()
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeChecked()
    }
  })

  it("lets Space toggle a focused checkbox without opening details or moving row focus", async () => {
    const user = userEvent.setup()
    render(
      <TransactionsList
        data={[
          transaction("a", "Alpha purchase"),
          transaction("b", "Bravo purchase")
        ]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )
    const rows = screen.getAllByRole("row")
    const checkbox = within(rows[1]).getByRole("checkbox")
    act(() => checkbox.focus())
    await user.keyboard("[Space]")
    expect(checkbox).toBeChecked()
    expect(checkbox).toHaveFocus()
    expect(rows[1]).toHaveAttribute("data-focused", "true")
    expect(within(rows[0]).getByRole("checkbox")).not.toBeChecked()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await user.keyboard("[Space]")
    expect(checkbox).not.toBeChecked()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("clears selection when changing groups, even when both groups contain the same row ID", async () => {
    const user = userEvent.setup()
    const props: TransactionsListProps = {
      data: [transaction("a", "First group purchase")],
      sort: "description-asc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(<TransactionsList {...props} />)
    await user.click(screen.getByRole("checkbox"))
    expect(screen.getByRole("status")).toHaveTextContent("1 selected")

    activeGroup.id = "2"
    rerender(
      <TransactionsList
        {...props}
        data={[
          {
            ...transaction("a", "Second group purchase"),
            group: { id: "2", name: "Second group" }
          }
        ]}
      />
    )

    expect(screen.getByRole("checkbox")).not.toBeChecked()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    activeGroup.id = "1"
    rerender(<TransactionsList {...props} />)
    expect(screen.getByRole("checkbox")).not.toBeChecked()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it.each([
    {
      option: "Groceries",
      category: {
        id: "category-1",
        name: "Groceries",
        icon: "shopping-cart",
        color: "lime"
      }
    },
    { option: "None", category: null }
  ])(
    "assigns $option only to the selected transactions",
    async ({ option, category }) => {
      const user = userEvent.setup()
      const onUpdateTransaction = vi.fn().mockResolvedValue(undefined)
      render(
        <TransactionsList
          data={[
            transaction("a", "Alpha purchase"),
            transaction("b", "Bravo purchase"),
            transaction("c", "Charlie purchase")
          ]}
          sort="description-asc"
          isLoading={false}
          isError={false}
          onUpdateTransaction={onUpdateTransaction}
          onDeleteTransactions={vi.fn()}
        />
      )
      const checkboxes = screen.getAllByRole("checkbox")
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])
      await user.click(
        screen.getByRole("button", {
          name: "Category for selected transactions"
        })
      )
      const categoryDialog = screen.getByRole("dialog", {
        name: "Category for selected transactions"
      })
      await user.type(
        within(categoryDialog).getByRole("combobox", {
          name: "Search categories"
        }),
        option
      )
      await user.click(
        within(categoryDialog).getByRole("option", { name: option })
      )

      await waitFor(() => expect(onUpdateTransaction).toHaveBeenCalledTimes(2))
      expect(onUpdateTransaction).toHaveBeenCalledWith("a", { category })
      expect(onUpdateTransaction).toHaveBeenCalledWith("b", { category })
      expect(onUpdateTransaction).not.toHaveBeenCalledWith(
        "c",
        expect.anything()
      )
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", {
            name: "Category for selected transactions"
          })
        ).not.toBeInTheDocument()
      )
      expect(screen.getByText("2 selected")).toBeInTheDocument()
      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).toBeChecked()
      expect(checkboxes[2]).not.toBeChecked()
      expect(
        screen.queryByRole("dialog", { name: "Transaction details" })
      ).not.toBeInTheDocument()
    }
  )

  it("retains selection and the category editor after a partial bulk update failure", async () => {
    const user = userEvent.setup()
    const onUpdateTransaction = vi
      .fn()
      .mockImplementation((id: string) =>
        id === "b" ? Promise.reject(new Error("Rejected")) : Promise.resolve()
      )
    render(
      <TransactionsList
        data={[
          transaction("a", "Alpha purchase"),
          transaction("b", "Bravo purchase")
        ]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={onUpdateTransaction}
        onDeleteTransactions={vi.fn()}
      />
    )
    await user.click(screen.getAllByRole("checkbox")[0])
    await user.click(screen.getAllByRole("checkbox")[1])
    await user.click(
      screen.getByRole("button", { name: "Category for selected transactions" })
    )
    await user.click(screen.getByRole("option", { name: "Groceries" }))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" })
      )
    )
    expect(onUpdateTransaction).toHaveBeenCalledTimes(2)
    expect(
      screen.getByRole("dialog", {
        name: "Category for selected transactions"
      })
    ).toBeInTheDocument()
    expect(screen.getByText("2 selected")).toBeInTheDocument()
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeChecked()
    }
    expect(
      screen.getByRole("combobox", { name: "Search categories" })
    ).toBeEnabled()
  })

  it("locks every row's editors and navigation until bulk categorization finishes", async () => {
    const user = userEvent.setup()
    let resolveUpdate: () => void = () => undefined
    const pendingUpdate = new Promise<void>((resolve) => {
      resolveUpdate = resolve
    })
    const onUpdateTransaction = vi.fn(() => pendingUpdate)
    render(
      <TransactionsList
        data={[
          transaction("a", "Alpha purchase"),
          transaction("b", "Bravo purchase")
        ]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={onUpdateTransaction}
        onDeleteTransactions={vi.fn()}
      />
    )
    const rows = screen.getAllByRole("row")
    await user.click(within(rows[0]).getByRole("checkbox"))
    await user.click(
      screen.getByRole("button", { name: "Category for selected transactions" })
    )
    await user.click(screen.getByRole("option", { name: "Groceries" }))
    await waitFor(() => expect(onUpdateTransaction).toHaveBeenCalledTimes(1))

    for (const row of rows) {
      expect(within(row).getByRole("checkbox")).toBeDisabled()
      expect(within(row).getByRole("combobox")).toBeDisabled()
      expect(
        within(row).getByRole("button", { name: /Open transaction:/ })
      ).toBeDisabled()
      fireEvent.click(row)
    }
    expect(
      screen.queryByRole("dialog", { name: "Transaction details" })
    ).not.toBeInTheDocument()

    await act(async () => resolveUpdate())
    await waitFor(() => {
      for (const row of rows) {
        expect(within(row).getByRole("checkbox")).toBeEnabled()
        expect(within(row).getByRole("combobox")).toBeEnabled()
        expect(
          within(row).getByRole("button", { name: /Open transaction:/ })
        ).toBeEnabled()
      }
    })
    expect(within(rows[0]).getByRole("checkbox")).toBeChecked()
    expect(within(rows[1]).getByRole("checkbox")).not.toBeChecked()
    fireEvent.click(rows[1])
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Bravo purchase"
    )
  })

  it("removes filtered purchases from selection and deletes only visible rows after select all", async () => {
    const first = transaction("1", "Visible first purchase")
    const hidden = transaction("2", "Hidden purchase")
    const third = transaction("3", "Visible third purchase")
    const onDeleteTransactions = vi.fn().mockResolvedValue(undefined)
    const props: TransactionsListProps = {
      data: [first, hidden, third],
      totalCount: 40,
      sort: "date-desc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions
    }

    const { rerender } = render(<TransactionsList {...props} />)
    fireEvent.click(
      within(
        screen
          .getByText(first.description!)
          .closest("[role=row]")! as HTMLElement
      ).getByRole("checkbox")
    )
    fireEvent.click(
      within(
        screen
          .getByText(hidden.description!)
          .closest("[role=row]")! as HTMLElement
      ).getByRole("checkbox")
    )
    expect(screen.getByText("2 selected")).toBeInTheDocument()

    rerender(<TransactionsList {...props} data={[first, third]} />)
    expect(screen.queryByText(hidden.description!)).not.toBeInTheDocument()
    expect(screen.getByText("1 selected")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Select all" }))
    expect(screen.getByText("2 selected")).toBeInTheDocument()
    expect(
      screen.getByText(first.description!).closest("[role=row]")
    ).toHaveAttribute("aria-selected", "true")
    expect(
      screen.getByText(third.description!).closest("[role=row]")
    ).toHaveAttribute("aria-selected", "true")

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }))
    await waitFor(() =>
      expect(onDeleteTransactions).toHaveBeenCalledWith([first.id, third.id])
    )
  })

  it("retains selection through loading and errors, then prunes only the settled filtered rows", () => {
    const first = transaction("a", "Matching purchase")
    const removed = transaction("b", "Filtered purchase")
    const props: TransactionsListProps = {
      data: [first, removed],
      sort: "description-asc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(<TransactionsList {...props} />)
    for (const checkbox of screen.getAllByRole("checkbox")) {
      fireEvent.click(checkbox)
    }
    expect(screen.getByRole("status")).toHaveTextContent("2 selected")

    rerender(<TransactionsList {...props} data={undefined} isLoading />)
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()

    rerender(<TransactionsList {...props} data={[first]} />)
    expect(screen.getByRole("checkbox")).toBeChecked()
    expect(screen.getByRole("status")).toHaveTextContent("1 selected")
    expect(screen.getByRole("status")).toHaveTextContent(/Net -R\$\s*10,00/)

    rerender(<TransactionsList {...props} data={undefined} isError />)
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()

    rerender(<TransactionsList {...props} data={[first]} />)
    expect(screen.getByRole("checkbox")).toBeChecked()
    expect(screen.getByRole("status")).toHaveTextContent("1 selected")
    expect(screen.queryByText(removed.description!)).not.toBeInTheDocument()
  })

  it("keeps the selected rows available when a bulk deletion fails", async () => {
    const onDeleteTransactions = vi
      .fn()
      .mockRejectedValue(new Error("Rejected"))
    render(
      <TransactionsList
        data={[transaction("a", "Selected purchase")]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={onDeleteTransactions}
      />
    )
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: "Could not delete the selected transactions",
        variant: "destructive"
      })
    )
    expect(onDeleteTransactions).toHaveBeenCalledWith(["a"])
    expect(screen.getByRole("checkbox", { hidden: true })).toBeChecked()
    expect(screen.getByText("1 selected")).toBeInTheDocument()
  })

  it("navigates, selects ranges, selects all, and opens the focused row with list shortcuts", () => {
    render(
      <TransactionsList
        data={[
          transaction("a", "Alpha purchase"),
          transaction("b", "Bravo purchase"),
          transaction("c", "Charlie purchase")
        ]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )
    const rows = screen.getAllByRole("row")
    expect(within(rows[0]).getByRole("gridcell")).toHaveAttribute(
      "tabindex",
      "0"
    )
    expect(within(rows[1]).getByRole("gridcell")).toHaveAttribute(
      "tabindex",
      "-1"
    )
    fireEvent.keyDown(window, { key: "ArrowDown" })
    expect(within(rows[0]).getByRole("gridcell")).toHaveFocus()
    fireEvent.keyDown(within(rows[0]).getByRole("gridcell"), { key: "j" })
    expect(within(rows[1]).getByRole("gridcell")).toHaveFocus()
    expect(within(rows[0]).getByRole("gridcell")).toHaveAttribute(
      "tabindex",
      "-1"
    )
    expect(within(rows[1]).getByRole("gridcell")).toHaveAttribute(
      "tabindex",
      "0"
    )
    expect(virtualizerMock.virtualizer.scrollToIndex).toHaveBeenLastCalledWith(
      1,
      { align: "auto" }
    )
    fireEvent.keyDown(within(rows[1]).getByRole("gridcell"), { key: "x" })
    expect(rows[1]).toHaveAttribute("aria-selected", "true")
    fireEvent.keyDown(within(rows[1]).getByRole("gridcell"), {
      key: "ArrowUp",
      shiftKey: true
    })
    expect(within(rows[0]).getByRole("gridcell")).toHaveFocus()
    expect(screen.getByText("2 selected")).toBeInTheDocument()
    fireEvent.keyDown(within(rows[0]).getByRole("gridcell"), {
      key: "a",
      metaKey: true
    })
    expect(screen.getByText("3 selected")).toBeInTheDocument()
    fireEvent.keyDown(within(rows[0]).getByRole("gridcell"), { key: "Escape" })
    expect(screen.queryByText("3 selected")).not.toBeInTheDocument()
    expect(
      rows.every((row) => row.getAttribute("aria-selected") === "false")
    ).toBe(true)
    fireEvent.keyDown(within(rows[0]).getByRole("gridcell"), { key: "k" })
    expect(within(rows[2]).getByRole("gridcell")).toHaveFocus()
    fireEvent.keyDown(within(rows[2]).getByRole("gridcell"), { key: "Enter" })
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Charlie purchase"
    )
  })

  it("yields list shortcuts to editors and an open details dialog", () => {
    render(
      <>
        <input aria-label="Find transactions" />
        <button type="button">Display options</button>
        <aside role="dialog" aria-hidden="true" aria-label="Period totals" />
        <TransactionsList
          data={[
            transaction("a", "Alpha purchase"),
            transaction("b", "Bravo purchase")
          ]}
          sort="description-asc"
          isLoading={false}
          isError={false}
          onUpdateTransaction={vi.fn()}
          onDeleteTransactions={vi.fn()}
        />
      </>
    )
    const rows = screen.getAllByRole("row")
    const input = screen.getByRole("textbox")
    input.focus()
    expect(fireEvent.keyDown(input, { key: "a", ctrlKey: true })).toBe(true)
    fireEvent.keyDown(input, { key: "j" })
    expect(rows[0]).not.toHaveAttribute("data-focused")
    const displayButton = screen.getByRole("button", {
      name: "Display options"
    })
    displayButton.focus()
    fireEvent.keyDown(displayButton, { key: "ArrowDown" })
    expect(rows[0]).not.toHaveAttribute("data-focused")
    fireEvent.keyDown(displayButton, { key: "j" })
    expect(within(rows[0]).getByRole("gridcell")).toHaveFocus()
    fireEvent.keyDown(within(rows[0]).getByRole("gridcell"), { key: "x" })
    fireEvent.keyDown(within(rows[0]).getByRole("gridcell"), { key: "Enter" })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    fireEvent.keyDown(window, { key: "ArrowDown" })
    fireEvent.keyDown(window, { key: "Escape" })
    expect(rows[0]).toHaveAttribute("data-focused", "true")
    expect(screen.getByText("1 selected")).toBeInTheDocument()
    expect(rows[1]).toHaveAttribute("aria-selected", "false")
  })

  it("keeps row focus at the first and last keyboard navigation boundaries", () => {
    render(
      <>
        <button type="button">Display options</button>
        <TransactionsList
          data={[
            transaction("a", "Alpha purchase"),
            transaction("b", "Bravo purchase")
          ]}
          sort="description-asc"
          isLoading={false}
          isError={false}
          onUpdateTransaction={vi.fn()}
          onDeleteTransactions={vi.fn()}
        />
      </>
    )
    const rows = screen.getAllByRole("row")
    fireEvent.keyDown(window, { key: "j" })
    fireEvent.keyDown(within(rows[0]).getByRole("gridcell"), { key: "k" })
    expect(within(rows[0]).getByRole("gridcell")).toHaveFocus()
    fireEvent.keyDown(within(rows[0]).getByRole("gridcell"), { key: "j" })
    fireEvent.keyDown(within(rows[1]).getByRole("gridcell"), { key: "j" })
    expect(within(rows[1]).getByRole("gridcell")).toHaveFocus()
    expect(rows[1]).toHaveAttribute("data-focused", "true")
    const displayButton = screen.getByRole("button", {
      name: "Display options"
    })
    displayButton.focus()
    fireEvent.keyDown(displayButton, { key: "j" })
    expect(within(rows[1]).getByRole("gridcell")).toHaveFocus()
    fireEvent.keyDown(within(rows[1]).getByRole("gridcell"), { key: "k" })
    displayButton.focus()
    fireEvent.keyDown(displayButton, { key: "k" })
    expect(within(rows[0]).getByRole("gridcell")).toHaveFocus()
  })

  it("selects hovered rows with X without moving focus and gives keyboard navigation precedence", () => {
    render(
      <TransactionsList
        data={[
          transaction("a", "Alpha purchase"),
          transaction("b", "Bravo purchase"),
          transaction("c", "Charlie purchase")
        ]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )
    const rows = screen.getAllByRole("row")
    fireEvent.mouseEnter(rows[1])
    expect(within(rows[1]).getByRole("gridcell")).not.toHaveFocus()
    expect(rows[1]).not.toHaveAttribute("data-focused")
    fireEvent.keyDown(window, { key: "x" })
    expect(rows[1]).toHaveAttribute("aria-selected", "true")
    fireEvent.keyDown(window, { key: "j" })
    expect(within(rows[0]).getByRole("gridcell")).toHaveFocus()
    fireEvent.keyDown(within(rows[0]).getByRole("gridcell"), { key: "x" })
    expect(rows[0]).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("2 selected")).toBeInTheDocument()
    fireEvent.mouseEnter(rows[2])
    expect(within(rows[0]).getByRole("gridcell")).toHaveFocus()
    fireEvent.keyDown(within(rows[0]).getByRole("gridcell"), { key: "x" })
    expect(rows[2]).toHaveAttribute("aria-selected", "true")
  })

  it("tracks descendant row focus without taking focus or detail shortcuts from metadata and category controls", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      }
    )
    render(
      <TransactionsList
        data={[
          transaction("a", "Alpha purchase"),
          transaction("b", "Bravo purchase")
        ]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )
    const rows = screen.getAllByRole("row")
    fireEvent.keyDown(window, { key: "j" })
    const metadata = within(rows[1]).getByRole("img", {
      name: "Checking account: Checking"
    })
    act(() => metadata.focus())
    expect(metadata).toHaveFocus()
    expect(rows[1]).toHaveAttribute("data-focused", "true")
    expect(rows[0]).not.toHaveAttribute("data-focused")
    fireEvent.mouseEnter(rows[0])
    expect(metadata).toHaveFocus()
    expect(fireEvent.keyDown(metadata, { key: "Enter" })).toBe(true)
    expect(fireEvent.keyDown(metadata, { key: "x" })).toBe(true)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument()
    const category = within(rows[0]).getByRole("combobox")
    act(() => category.focus())
    expect(category).toHaveFocus()
    expect(rows[0]).toHaveAttribute("data-focused", "true")
    fireEvent.keyDown(category, { key: "x" })
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument()
  })
})
