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
import type { TransactionOutput as Transaction } from "@fina/types"
import { afterEach, describe, expect, it, vi } from "vitest"

import TransactionsTable, {
  type TransactionsTableProps
} from "./TransactionsTable"

const virtualizerMock = vi.hoisted(() => {
  const state: { count: number; indexes: number[] | null } = {
    count: 0,
    indexes: null
  }

  return {
    state,
    virtualizer: {
      getTotalSize: () => state.count * 80,
      getVirtualItems: () =>
        (
          state.indexes ??
          Array.from({ length: state.count }, (_, index) => index)
        ).map((index) => ({
          index,
          key: index,
          start: index * 80
        }))
    }
  }
})

const activeGroup = vi.hoisted(() => ({ id: "1" }))

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
  useToast: () => ({ toast: vi.fn() })
}))

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => {
    virtualizerMock.state.count = count
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
    dueDate: null
  },
  category: null,
  group: { id: "1", name: "My finances" },
  import: null
})

describe("TransactionsTable", () => {
  afterEach(() => {
    activeGroup.id = "1"
    virtualizerMock.state.indexes = null
    cleanup()
  })

  it("shows and sorts original calendar dates in monthly review, including missing dates", () => {
    render(
      <TransactionsTable
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
        totalCount={3}
        pageIndex={0}
        pageSize={100}
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
    expect(within(rows[0]).getByText("Later purchase")).toBeInTheDocument()
    expect(
      within(rows[0]).getByRole("cell", { name: "02 Jul 2026" })
    ).toBeInTheDocument()
    expect(
      within(rows[1]).getByRole("cell", { name: "12 May 2026" })
    ).toBeInTheDocument()
    expect(within(rows[2]).getByRole("cell", { name: "—" })).toBeInTheDocument()
  })

  it("keeps the ledger mounted while browsing transactions in the modal", () => {
    render(
      <TransactionsTable
        data={[
          transaction("1", "First transaction"),
          transaction("2", "Second transaction")
        ]}
        totalCount={2}
        pageIndex={0}
        pageSize={100}
        sort="date-desc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )

    const firstLedgerRow = document.querySelector("tbody tr")
    expect(firstLedgerRow).not.toBeNull()
    fireEvent.click(firstLedgerRow!)
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "First transaction"
    )

    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))

    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Second transaction"
    )
    expect(document.querySelector("tbody tr")).toBe(firstLedgerRow)
  })

  it("keeps the same transaction open when refreshed rows change order", () => {
    const first = transaction("1", "First transaction")
    const second = transaction("2", "Second transaction")
    const props: TransactionsTableProps = {
      data: [first, second],
      totalCount: 2,
      pageIndex: 0,
      pageSize: 100,
      sort: "date-desc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }

    const { rerender } = render(<TransactionsTable {...props} />)
    const firstLedgerRow = document.querySelector("tbody tr")
    expect(firstLedgerRow).not.toBeNull()
    fireEvent.click(firstLedgerRow!)
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "First transaction"
    )

    rerender(<TransactionsTable {...props} data={[second, first]} />)

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
    const props: TransactionsTableProps = {
      data: [first, second, third],
      totalCount: 3,
      pageIndex: 0,
      pageSize: 100,
      sort: "category-asc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(<TransactionsTable {...props} />)
    fireEvent.click(screen.getByText("Transaction a").closest("tr")!)

    const updatedFirst = categorizedTransaction("a", "Zulu")
    rerender(
      <TransactionsTable {...props} data={[second, third, updatedFirst]} />
    )
    expect(screen.getByTestId("modal-category")).toHaveTextContent("Zulu")
    expect(screen.getByTestId("modal-position")).toHaveTextContent("1 / 3")
    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }))
    expect(screen.getByTestId("modal-description")).toHaveTextContent(
      "Transaction b"
    )

    const updatedSecond = categorizedTransaction("b", "Yankee")
    rerender(
      <TransactionsTable
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
    fireEvent.click(screen.getByText("Transaction c").closest("tr")!)
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
    const props: TransactionsTableProps = {
      data: [first, second, third],
      totalCount: 3,
      pageIndex: 0,
      pageSize: 100,
      sort: "description-asc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(<TransactionsTable {...props} />)
    fireEvent.click(screen.getByText("First transaction").closest("tr")!)
    rerender(<TransactionsTable {...props} data={[added, first, third]} />)
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
    fireEvent.click(screen.getByText("Added transaction").closest("tr")!)
    expect(screen.getByTestId("modal-position")).toHaveTextContent("1 / 3")
  })

  it("ends the details session when switching groups", () => {
    const firstGroupTransaction = transaction("a", "First group purchase")
    const secondGroupTransaction: Transaction = {
      ...transaction("b", "Second group purchase"),
      group: { id: "2", name: "Second group" }
    }
    const props: TransactionsTableProps = {
      data: [firstGroupTransaction],
      totalCount: 1,
      pageIndex: 0,
      pageSize: 100,
      sort: "date-desc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const { rerender } = render(<TransactionsTable {...props} />)
    fireEvent.click(screen.getByText("First group purchase").closest("tr")!)
    expect(screen.getByRole("dialog")).toHaveTextContent("First group purchase")

    activeGroup.id = "2"
    rerender(<TransactionsTable {...props} data={[secondGroupTransaction]} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    activeGroup.id = "1"
    rerender(<TransactionsTable {...props} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    fireEvent.click(screen.getByText("First group purchase").closest("tr")!)
    expect(screen.getByRole("dialog")).toHaveTextContent("First group purchase")
  })

  it("renders the latest virtual range when the stable virtualizer changes", () => {
    const props: TransactionsTableProps = {
      data: [
        transaction("1", "First transaction"),
        transaction("2", "Second transaction")
      ],
      totalCount: 2,
      pageIndex: 0,
      pageSize: 100,
      sort: "date-desc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    virtualizerMock.state.indexes = [0]

    const { rerender } = render(<TransactionsTable {...props} />)
    expect(screen.getByText("First transaction")).toBeInTheDocument()
    expect(screen.queryByText("Second transaction")).not.toBeInTheDocument()

    virtualizerMock.state.indexes = [1]
    rerender(<TransactionsTable {...props} />)

    expect(screen.queryByText("First transaction")).not.toBeInTheDocument()
    expect(screen.getByText("Second transaction")).toBeInTheDocument()
  })

  it("renders an editable category chip for an inline credit-card transaction", () => {
    const creditTransaction: Transaction = {
      ...transaction("credit-1", "Card purchase"),
      bankaccount: {
        id: "credit-account",
        name: "Main card",
        type: "credit",
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
      <TransactionsTable
        data={[creditTransaction]}
        totalCount={1}
        pageIndex={0}
        pageSize={100}
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
    const row = screen.getByText("Card purchase").closest("tr")
    expect(row).toHaveClass("bg-fina-surface")
    expect(row).not.toHaveClass("bg-fina-sky")
    expect(row).toHaveStyle({
      boxShadow: "inset 5px 0 0 var(--fina-sky)"
    })
  })

  it("selects on command-click without opening transaction details", () => {
    render(
      <TransactionsTable
        data={[transaction("1", "Command-selected transaction")]}
        totalCount={1}
        pageIndex={0}
        pageSize={100}
        sort="date-desc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )

    const row = document.querySelector("tbody tr")
    expect(row).not.toBeNull()
    fireEvent.click(row!, { metaKey: true })

    expect(row).toHaveAttribute("aria-selected", "true")
    expect(row).toHaveClass("bg-fina-lime")
    expect(screen.getByText("1 selected")).toBeInTheDocument()
    expect(
      screen.queryByRole("dialog", { name: "Transaction details" })
    ).not.toBeInTheDocument()
  })

  it("removes filtered purchases from selection and deletes only visible rows after select all", async () => {
    const first = transaction("1", "Visible first purchase")
    const hidden = transaction("2", "Hidden purchase")
    const third = transaction("3", "Visible third purchase")
    const onDeleteTransactions = vi.fn().mockResolvedValue(undefined)
    const props: TransactionsTableProps = {
      data: [first, hidden, third],
      totalCount: 3,
      pageIndex: 0,
      pageSize: 100,
      sort: "date-desc",
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions
    }

    const { rerender } = render(<TransactionsTable {...props} />)
    fireEvent.click(screen.getByText(first.description!).closest("tr")!, {
      metaKey: true
    })
    fireEvent.click(screen.getByText(hidden.description!).closest("tr")!, {
      metaKey: true
    })
    expect(screen.getByText("2 selected")).toBeInTheDocument()

    rerender(
      <TransactionsTable {...props} data={[first, third]} totalCount={2} />
    )
    expect(screen.queryByText(hidden.description!)).not.toBeInTheDocument()
    expect(screen.getByText("1 selected")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Select all" }))
    expect(screen.getByText("2 selected")).toBeInTheDocument()
    expect(screen.getByText(first.description!).closest("tr")).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByText(third.description!).closest("tr")).toHaveAttribute(
      "aria-selected",
      "true"
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }))
    await waitFor(() =>
      expect(onDeleteTransactions).toHaveBeenCalledWith([first.id, third.id])
    )
  })
})
