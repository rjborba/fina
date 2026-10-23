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
import type { CreditCardBillSummary, TransactionOutput } from "@fina/types"
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

import { CreditCardBillsLedger } from "./CreditCardBillsLedger"
import { DEFAULT_TRANSACTION_DISPLAY_PROPERTIES } from "./transactionDisplay"

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
    scrollToIndex: vi.fn(),
    getTotalSize: () => count * 40,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 40
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
  flagged: false,
  cardName: null,
  cardLast4: null,
  id: "checking-1",
  createdAt: "2026-06-09T00:00:00.000Z",
  description: "Checking purchase",
  value: -10,
  date: "2026-06-09T00:00:00.000Z",
  installmentTotal: null,
  installmentCurrent: null,
  creditDueDate: null,
  observation: null,
  commentCount: 0,
  conversationResolved: false,
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
    institutionId: "inter",
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
  accountInstitutionId: "nubank",
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

describe("CreditCardBillsLedger selection", () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => undefined
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
  })

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      }
    )
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it("aligns checking and bill metadata tracks while leaving aggregate-only blank slots non-interactive", () => {
    const rich: TransactionOutput = {
      ...checkingTransaction,
      installmentCurrent: "1",
      installmentTotal: 12,
      import: { id: "31", fileName: "alignment-fixture.csv" }
    }
    const missing: TransactionOutput = {
      ...checkingTransaction,
      id: "missing-account",
      description: "Missing account purchase",
      bankaccount: null,
      category: null
    }
    const props = {
      transactions: [rich, missing],
      bills: [bill],
      sort: "description-asc" as const,
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const view = render(<CreditCardBillsLedger {...props} />)
    const billRow = screen.getByTestId("credit-card-bill-row")
    const richRow = screen
      .getByText("Checking purchase")
      .closest<HTMLElement>('[role="row"]')!
    const missingRow = screen
      .getByText("Missing account purchase")
      .closest<HTMLElement>('[role="row"]')!
    const slots = ["description", "status", "installment", "category"]
    for (const row of [billRow, richRow, missingRow]) {
      expect(metadataSlots(row)).toEqual(slots)
      for (const slot of row.querySelectorAll(
        '[data-metadata-slot]:not([data-metadata-slot="description"])'
      )) {
        expect(slot).toHaveClass("justify-end", "text-right")
      }
      expect(within(row).getByTestId("transaction-description")).toHaveClass(
        "text-left"
      )
      expect(within(row).getAllByRole("gridcell")).toHaveLength(1)
      expect(row).toHaveStyle({ height: "40px" })
    }
    expect(billRow.querySelector('[data-inline-metadata="import"]')).toBeNull()
    for (const id of ["installment", "category"])
      expectEmptyMetadataSlot(billRow, id)
    expect(within(billRow).queryByRole("combobox")).not.toBeInTheDocument()
    expect(within(billRow).queryByRole("checkbox")).not.toBeInTheDocument()
    expect(
      within(billRow).getByText("Needs reconciliation")
    ).toBeInTheDocument()
    expectEmptyMetadataSlot(richRow, "status")
    expect(within(richRow).getByText("1/12")).toBeInTheDocument()
    expect(within(richRow).getByText("1/12")).toHaveClass("text-right")
    expect(
      within(richRow).getByRole("img", {
        name: "Imported from alignment-fixture.csv"
      })
    ).toBeInTheDocument()
    for (const id of ["installment", "status"])
      expectEmptyMetadataSlot(missingRow, id)
    expect(missingRow.querySelector("[data-inline-metadata]")).toBeNull()
    expect(
      within(missingRow).getByRole("combobox", {
        name: "Change category for Missing account purchase"
      })
    ).toHaveTextContent("Uncategorized")
    expect(within(missingRow).getByText("Uncategorized")).toBeInTheDocument()
    fireEvent.click(within(richRow).getByRole("checkbox"))
    expect(richRow).toHaveAttribute("aria-selected", "true")

    view.rerender(
      <CreditCardBillsLedger
        {...props}
        displayProperties={{
          ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
          accountName: false,
          installment: false,
          category: false
        }}
      />
    )
    for (const row of screen.getAllByRole("row"))
      expect(metadataSlots(row)).toEqual(["description", "status"])
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(document.querySelector("[data-category-dot]")).toBeNull()
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument()
    expect(screen.queryByText("1/12")).not.toBeInTheDocument()
    expect(
      within(billRow).getByText("Needs reconciliation")
    ).toBeInTheDocument()
    expect(richRow).toHaveAttribute("aria-selected", "true")
    fireEvent.click(billRow)
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/credit-card-bills/credit-account/2026-06"
    )
    expect(billRow).not.toHaveAttribute("aria-selected")
    view.rerender(<CreditCardBillsLedger {...props} />)
    for (const row of screen.getAllByRole("row"))
      expect(metadataSlots(row)).toEqual(slots)
    expectEmptyMetadataSlot(billRow, "category")
    expect(richRow).toHaveAttribute("aria-selected", "true")
  })

  it("toggles account logos and names as one chip for checking rows and grouped bills without hiding import or card indicators", () => {
    const props = {
      transactions: [
        {
          ...checkingTransaction,
          import: { id: "31", fileName: "account-chip.csv" }
        }
      ],
      bills: [bill],
      sort: "date-desc" as const,
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const view = render(
      <CreditCardBillsLedger
        {...props}
        displayProperties={{
          ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
          accountName: true
        }}
      />
    )
    const chips = screen.getAllByTestId("transaction-account")
    expect(chips).toHaveLength(2)
    for (const chip of chips) {
      expect(chip).toHaveClass("rounded-full", "border")
      expect(chip.querySelector('[aria-hidden="true"]')).not.toBeNull()
    }
    expect(
      screen.getByRole("group", { name: "Checking account: Checking" })
    ).toHaveTextContent("Checking")
    expect(
      screen.getByRole("group", { name: "Credit card account: Main card" })
    ).toHaveTextContent("Main card")
    view.rerender(<CreditCardBillsLedger {...props} />)
    expect(screen.queryByTestId("transaction-account")).not.toBeInTheDocument()
    expect(document.querySelector('[data-metadata-slot="account"]')).toBeNull()
    expect(
      screen.getByRole("img", { name: "Imported from account-chip.csv" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("img", {
        name: "Credit card: Combined bill for Main card"
      })
    ).toBeInTheDocument()
    view.rerender(
      <CreditCardBillsLedger
        {...props}
        displayProperties={{
          ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
          accountName: true
        }}
      />
    )
    expect(screen.getAllByTestId("transaction-account")).toHaveLength(2)
  })

  it("retains an inert fixed installment slot in bill-only results and releases it only when hidden", () => {
    const props = {
      transactions: [],
      bills: [bill],
      sort: "date-desc" as const,
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn()
    }
    const view = render(<CreditCardBillsLedger {...props} />)
    const row = screen.getByTestId("credit-card-bill-row")
    expectEmptyMetadataSlot(row, "installment")
    const layout = screen.getByRole("grid").parentElement!
    expect(
      layout.style.getPropertyValue("--transaction-metadata-base-columns")
    ).toContain("40px")
    expect(within(row).queryByRole("combobox")).not.toBeInTheDocument()
    expect(within(row).queryByRole("checkbox")).not.toBeInTheDocument()
    view.rerender(
      <CreditCardBillsLedger
        {...props}
        displayProperties={{
          ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
          installment: false
        }}
      />
    )
    expect(row.querySelector('[data-metadata-slot="installment"]')).toBeNull()
    expect(
      layout.style.getPropertyValue("--transaction-metadata-base-columns")
    ).not.toContain("40px")
    expect(within(row).getByText("Needs reconciliation")).toBeInTheDocument()
    fireEvent.click(row)
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/credit-card-bills/credit-account/2026-06"
    )
  })

  it("uses list navigation for bills while keeping their aggregate out of bulk selection", () => {
    render(
      <CreditCardBillsLedger
        transactions={[checkingTransaction]}
        bills={[bill]}
        sort="date-desc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
        displayProperties={{
          ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
          accountName: true
        }}
      />
    )
    const grid = screen.getByRole("grid", { name: "Transactions" })
    expect(grid).toHaveAttribute("aria-rowcount", "2")
    expect(grid).toHaveAttribute("aria-colcount", "1")
    expect(grid).toHaveAttribute("aria-multiselectable", "true")
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(2)
    expect(document.querySelector("table, thead, tbody, tr, td, th")).toBeNull()
    const billRow = screen.getByTestId("credit-card-bill-row")
    const checkingRow = screen.getByTestId("grouped-transaction-row")
    expect(
      billRow.querySelector('[data-institution-id="nubank"] img')
    ).not.toBeNull()
    expect(
      checkingRow.querySelector('[data-institution-id="inter"] img')
    ).not.toBeNull()
    const billCell = within(billRow).getByRole("gridcell")
    const checkingCell = within(checkingRow).getByRole("gridcell")
    const billButton = within(billRow).getByRole("button", {
      name: "Main card bill"
    })
    expect(billButton.tagName).toBe("BUTTON")
    expect(billButton).toHaveAttribute("tabindex", "-1")
    expect(billButton.closest('[role="row"]')).toBe(billRow)
    expect(billRow.querySelector("button button")).toBeNull()
    fireEvent.keyDown(window, { key: "j" })
    expect(billCell).toHaveFocus()
    expect(billCell).toHaveAttribute("tabindex", "0")
    expect(checkingCell).toHaveAttribute("tabindex", "-1")
    fireEvent.keyDown(billCell, { key: "x" })
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "Turn on inline credit card transactions to select bill purchases"
    })
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument()
    fireEvent.keyDown(billCell, { key: "a", ctrlKey: true })
    expect(checkingRow).toHaveAttribute("aria-selected", "true")
    expect(billRow).not.toHaveAttribute("aria-selected")
    fireEvent.keyDown(billCell, { key: " " })
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/credit-card-bills/credit-account/2026-06"
    )
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

    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument()
    const rows = screen.getAllByRole("row")
    expect(rows[0].querySelector('[data-column="date"]')).toHaveTextContent(
      "02 Jul 2026"
    )
    expect(rows[1].querySelector('[data-column="date"]')).toHaveTextContent(
      "Jun 2026"
    )
    expect(rows[2].querySelector('[data-column="date"]')).toHaveTextContent(
      "12 May 2026"
    )
  })

  it("hides properties in checking and bill rows while retaining bill status, navigation, and selection", () => {
    const purchase: TransactionOutput = {
      ...checkingTransaction,
      installmentCurrent: "1",
      installmentTotal: 3,
      import: { id: "fixture-import", fileName: "fixture.csv" }
    }
    const props = {
      transactions: [purchase],
      bills: [bill],
      sort: "date-desc" as const,
      isLoading: false,
      isError: false,
      onUpdateTransaction: vi.fn(),
      onDeleteTransactions: vi.fn(),
      displayProperties: DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
    }
    const { rerender } = render(<CreditCardBillsLedger {...props} />)
    expect(
      screen.getByRole("img", { name: "Imported from fixture.csv" })
    ).toBeInTheDocument()
    expect(screen.getByText("1/3")).toBeInTheDocument()

    rerender(
      <CreditCardBillsLedger
        {...props}
        displayProperties={{
          date: false,
          accountName: false,
          category: false,
          installment: false,
          value: false,
          cardNumber: false,
          card: false
        }}
      />
    )
    const billRow = screen.getByTestId("credit-card-bill-row")
    const checkingRow = screen.getByTestId("grouped-transaction-row")
    expect(
      within(checkingRow).getByText("Checking purchase")
    ).toBeInTheDocument()
    expect(within(billRow).getByText("Main card bill")).toBeInTheDocument()
    expect(
      within(billRow).getByText("Needs reconciliation")
    ).toBeInTheDocument()
    expect(document.querySelector('[data-column="date"]')).toBeNull()
    expect(document.querySelector('[data-column="value"]')).toBeNull()
    expect(screen.queryByTestId("transaction-account")).not.toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "Imported from fixture.csv" })
    ).toBeInTheDocument()
    expect(screen.queryByText("Checking")).not.toBeInTheDocument()
    expect(screen.queryByText("1/3")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument()
    fireEvent.click(checkingRow, { metaKey: true })
    expect(checkingRow).toHaveAttribute("aria-selected", "true")
    expect(billRow).not.toHaveAttribute("aria-selected")
    fireEvent.click(billRow)
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/credit-card-bills/credit-account/2026-06"
    )

    rerender(<CreditCardBillsLedger {...props} />)
    expect(document.querySelectorAll('[data-column="date"]')).toHaveLength(2)
    expect(document.querySelectorAll('[data-column="value"]')).toHaveLength(2)
    expect(
      screen.getByRole("combobox", {
        name: "Change category for Checking purchase"
      })
    ).toHaveTextContent("Groceries")
    expect(
      screen.getByRole("img", { name: "Imported from fixture.csv" })
    ).toBeInTheDocument()
    expect(screen.getByText("1/3")).toBeInTheDocument()
    expect(checkingRow).toHaveAttribute("aria-selected", "true")
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

  it("provides checking-row checkboxes but never selects derived bills through select all", () => {
    const secondTransaction: TransactionOutput = {
      ...checkingTransaction,
      id: "checking-2",
      description: "Second checking purchase",
      value: -25
    }
    render(
      <CreditCardBillsLedger
        transactions={[checkingTransaction, secondTransaction]}
        bills={[bill]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={vi.fn()}
        onDeleteTransactions={vi.fn()}
      />
    )
    const billRow = screen.getByTestId("credit-card-bill-row")
    const checkingRows = screen.getAllByTestId("grouped-transaction-row")
    expect(within(billRow).queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.getAllByRole("checkbox")).toHaveLength(2)
    fireEvent.click(within(checkingRows[0]).getByRole("checkbox"))
    expect(screen.getByRole("status")).toHaveTextContent("1 selected")
    fireEvent.click(screen.getByRole("button", { name: "Select all" }))

    expect(screen.getByRole("status")).toHaveTextContent("2 selected")
    expect(screen.getByRole("status")).toHaveTextContent(/Net -R\$\s*35\.00/)
    expect(billRow).not.toHaveAttribute("aria-selected")
    for (const row of checkingRows) {
      expect(within(row).getByRole("checkbox")).toBeChecked()
      expect(row).toHaveAttribute("aria-selected", "true")
    }
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it("locks checking editors and bill navigation until bulk categorization finishes", async () => {
    const user = userEvent.setup()
    let resolveUpdate: () => void = () => undefined
    const pendingUpdate = new Promise<void>((resolve) => {
      resolveUpdate = resolve
    })
    const onUpdateTransaction = vi.fn(() => pendingUpdate)
    render(
      <CreditCardBillsLedger
        transactions={[
          checkingTransaction,
          {
            ...checkingTransaction,
            id: "checking-2",
            description: "Second checking purchase"
          }
        ]}
        bills={[bill]}
        sort="description-asc"
        isLoading={false}
        isError={false}
        onUpdateTransaction={onUpdateTransaction}
        onDeleteTransactions={vi.fn()}
      />
    )
    const checkingRows = screen.getAllByTestId("grouped-transaction-row")
    const billRow = screen.getByTestId("credit-card-bill-row")
    await user.click(within(checkingRows[0]).getByRole("checkbox"))
    await user.click(
      screen.getByRole("button", { name: "Category for selected transactions" })
    )
    await user.click(screen.getByRole("option", { name: "Housing" }))
    await waitFor(() => expect(onUpdateTransaction).toHaveBeenCalledTimes(1))

    for (const row of checkingRows) {
      expect(within(row).getByRole("checkbox")).toBeDisabled()
      expect(within(row).getByRole("combobox")).toBeDisabled()
      expect(
        within(row).getByRole("button", { name: /Open transaction:/ })
      ).toBeDisabled()
      fireEvent.click(row)
    }
    expect(
      within(billRow).getByRole("button", { name: "Main card bill" })
    ).toBeDisabled()
    fireEvent.click(billRow)
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(
      screen.queryByRole("dialog", { name: "Transaction details" })
    ).not.toBeInTheDocument()

    await act(async () => resolveUpdate())
    await waitFor(() => {
      for (const row of checkingRows) {
        expect(within(row).getByRole("checkbox")).toBeEnabled()
        expect(within(row).getByRole("combobox")).toBeEnabled()
        expect(
          within(row).getByRole("button", { name: /Open transaction:/ })
        ).toBeEnabled()
      }
      expect(
        within(billRow).getByRole("button", { name: "Main card bill" })
      ).toBeEnabled()
    })
    expect(within(checkingRows[0]).getByRole("checkbox")).toBeChecked()
    expect(within(checkingRows[1]).getByRole("checkbox")).not.toBeChecked()
    fireEvent.click(billRow)
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/credit-card-bills/credit-account/2026-06"
    )
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

    const billButton = screen.getByRole("button", { name: "Main card bill" })
    fireEvent.click(billButton, {
      metaKey: true
    })

    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "Turn on inline credit card transactions to select bill purchases"
    })
    fireEvent.click(billButton)
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/credit-card-bills/credit-account/2026-06"
    )
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
