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
import type { TransactionOutput } from "@fina/types"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TransactionDetailsModal } from "./TransactionDetailsModal"

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toast: vi.fn()
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

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({ selectedGroup: { id: "1" } })
}))

vi.mock("@/data/bankAccounts/useBankAccounts", () => ({
  useBankAccounts: () => ({ data: [] })
}))

vi.mock("@/data/categories/useCategories", () => ({
  useCategories: () => ({ data: categories })
}))

vi.mock("@/data/transactions/useTransactionsMutation", () => ({
  useTransactionMutation: () => ({
    updateMutation: { mutateAsync: mocks.mutateAsync }
  })
}))

vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }))
vi.mock("@/data/transactions/useTransactionConversation", () => ({
  useTransactionConversation: () => ({
    query: { data: { transactionId: "7", resolved: false, messages: [] } },
    add: { isPending: false },
    resolve: { isPending: false }
  })
}))

const transaction: TransactionOutput = {
  id: "7",
  flagged: false,
  cardName: null,
  cardLast4: null,
  createdAt: "2026-09-27T00:00:00.000Z",
  description: "Historical transaction",
  value: -10,
  date: "2026-09-27T00:00:00.000Z",
  installmentTotal: null,
  installmentCurrent: null,
  creditDueDate: null,
  observation: null,
  commentCount: 0,
  conversationResolved: false,
  toBeConsideredAt: null,
  calculatedDate: "2026-09-27",
  billPayment: null,
  reviewMonth: "2026-06",
  cashFlowDate: "2026-09-27",
  cashFlowStatus: "scheduled",
  bankaccount: null,
  category: null,
  group: { id: "1", name: "My finances" },
  import: null
}

describe("TransactionDetailsModal", () => {
  beforeEach(() => {
    mocks.mutateAsync.mockReset()
    mocks.mutateAsync.mockResolvedValue(undefined)
    mocks.toast.mockReset()
  })

  afterEach(cleanup)

  it("shows labeled transaction details with installment progress above the amount", () => {
    render(
      <TransactionDetailsModal
        transaction={{
          ...transaction,
          cardName: "Personal",
          cardLast4: "0042",
          calculatedDate: "2026-10-01",
          toBeConsideredAt: "2026-10-05",
          creditDueDate: "2026-10-10",
          installmentCurrent: "3",
          installmentTotal: 12,
          bankaccount: {
            id: "21",
            name: "Personal account",
            type: "credit",
            institutionId: "nubank",
            dueDate: 10
          }
        }}
        open
        onOpenChange={vi.fn()}
        totalTransactions={1}
        currentTransactionIndex={0}
        onNextTransaction={vi.fn()}
        onPreviousTransaction={vi.fn()}
      />
    )
    expect(screen.queryByLabelText("Card name")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Save card details" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("Calculated", { exact: true })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("Considered", { exact: true })
    ).not.toBeInTheDocument()
    for (const label of [
      "Transaction date",
      "Card",
      "Account",
      "Conversation"
    ]) {
      expect(screen.getByText(label, { exact: true })).toBeVisible()
    }
    expect(screen.getByText("Personal · ••0042")).toBeVisible()
    expect(screen.queryByText("More details")).not.toBeInTheDocument()
    expect(
      screen.getByRole("group", { name: "Installment" })
    ).toHaveTextContent("3/12")
    expect(
      screen
        .getByRole("group", { name: "Installment" })
        .compareDocumentPosition(
          screen.getByRole("group", { name: "Amount" })
        ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    const categoryChoices = screen.getByRole("region", { name: "Category" })
    expect(
      within(categoryChoices).getByRole("button", { name: "1 First category" })
    ).toBeVisible()
    const facts = screen.getByRole("complementary", {
      name: "Transaction data"
    })
    expect(within(facts).getByText("Personal · ••0042")).toBeVisible()
    expect(within(facts).getByText("Personal account")).toBeVisible()
    expect(within(facts).queryByText("3/12")).not.toBeInTheDocument()
    expect(
      within(facts).getByRole("button", { name: "Add transaction comment" })
    ).toBeVisible()
    expect(facts).toHaveTextContent(
      /Transaction date.*Card.*Account.*Conversation.*Credit due date.*Source.*Workspace.*Added/
    )
    expect(screen.getByText(/^Added /)).toBeVisible()
    expect(screen.getByText("Credit due date")).toBeVisible()
    expect(screen.getByText("Manual entry")).toBeVisible()
    expect(within(facts).getByText("My finances")).toBeVisible()
    expect(screen.getByRole("button", { name: /Uncategorized/ })).toBeVisible()
  })

  it("closes the thread with Escape without closing transaction details or categorizing", async () => {
    const onOpenChange = vi.fn()
    render(
      <TransactionDetailsModal
        transaction={transaction}
        open
        onOpenChange={onOpenChange}
        totalTransactions={1}
        currentTransactionIndex={0}
        onNextTransaction={vi.fn()}
        onPreviousTransaction={vi.fn()}
      />
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Add transaction comment" })
    )
    const editor = screen.getByRole("textbox", { name: "Comment" })
    fireEvent.change(editor, { target: { value: "Draft 123" } })
    fireEvent.keyDown(editor, { key: "1", code: "Digit1" })
    fireEvent.keyDown(editor, { key: "Escape", code: "Escape" })
    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: "Comment" })
      ).not.toBeInTheDocument()
    )
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
  })

  it("shows checking details without reference-month controls", () => {
    render(
      <TransactionDetailsModal
        transaction={{
          ...transaction,
          bankaccount: {
            id: "20",
            name: "Checking",
            type: "checkout",
            institutionId: "inter",
            dueDate: null
          }
        }}
        open
        onOpenChange={vi.fn()}
        totalTransactions={1}
        currentTransactionIndex={0}
        onNextTransaction={vi.fn()}
        onPreviousTransaction={vi.fn()}
      />
    )
    expect(
      document.querySelector('[data-institution-id="inter"] img')
    ).not.toBeNull()
    expect(screen.queryByLabelText("Reference month")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("group", { name: "Installment" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("Review month", { exact: true })
    ).not.toBeInTheDocument()
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
  })

  it("shows credit due dates without whole-bill or individual month overrides", () => {
    render(
      <TransactionDetailsModal
        transaction={{
          ...transaction,
          creditDueDate: "2026-07-10",
          bankaccount: {
            id: "21",
            name: "Card",
            type: "credit",
            institutionId: "nubank",
            dueDate: 10
          }
        }}
        open
        onOpenChange={vi.fn()}
        totalTransactions={1}
        currentTransactionIndex={0}
        onNextTransaction={vi.fn()}
        onPreviousTransaction={vi.fn()}
      />
    )
    expect(
      document.querySelector('[data-institution-id="nubank"] img')
    ).not.toBeNull()
    expect(
      screen.queryByRole("link", { name: "Change month for the whole bill" })
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Reference month")).not.toBeInTheDocument()
  })

  it("categorizes with number keys without displaying shortcut instructions", async () => {
    render(
      <TransactionDetailsModal
        transaction={transaction}
        open
        onOpenChange={vi.fn()}
        totalTransactions={1}
        currentTransactionIndex={0}
        onNextTransaction={vi.fn()}
        onPreviousTransaction={vi.fn()}
      />
    )

    expect(screen.queryByText(/Keys 1–/)).not.toBeInTheDocument()
    expect(screen.queryByText("Transaction / Details")).not.toBeInTheDocument()
    expect(screen.queryByText("Edit / Category")).not.toBeInTheDocument()
    document.addEventListener("keydown", (event) => event.stopPropagation(), {
      once: true
    })
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "1" })

    await waitFor(() =>
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        id: "7",
        transaction: { category: categories[0] }
      })
    )
  })

  it("takes focus from background controls before handling category shortcuts", async () => {
    const modal = (open: boolean) => (
      <>
        <input aria-label="Background filter" />
        <TransactionDetailsModal
          transaction={transaction}
          open={open}
          onOpenChange={vi.fn()}
          totalTransactions={1}
          currentTransactionIndex={0}
          onNextTransaction={vi.fn()}
          onPreviousTransaction={vi.fn()}
        />
      </>
    )
    const { rerender } = render(modal(false))
    const backgroundFilter = screen.getByRole("textbox", {
      name: "Background filter"
    })

    backgroundFilter.focus()
    expect(backgroundFilter).toHaveFocus()

    rerender(modal(true))

    const dialog = await screen.findByRole("dialog")
    await waitFor(() => expect(dialog).toHaveFocus())

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "1",
      code: "Digit1"
    })

    await waitFor(() =>
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        id: "7",
        transaction: { category: categories[0] }
      })
    )
  })

  it("closes on the first Escape even if a background control swallows the key", () => {
    const onOpenChange = vi.fn()
    const modal = (open: boolean) => (
      <>
        <input aria-label="Background filter" />
        <TransactionDetailsModal
          transaction={transaction}
          open={open}
          onOpenChange={onOpenChange}
          totalTransactions={1}
          currentTransactionIndex={0}
          onNextTransaction={vi.fn()}
          onPreviousTransaction={vi.fn()}
        />
      </>
    )
    const { rerender } = render(modal(false))
    const backgroundFilter = screen.getByRole("textbox", {
      name: "Background filter"
    })
    backgroundFilter.addEventListener("keydown", (event) =>
      event.stopPropagation()
    )
    backgroundFilter.focus()
    rerender(modal(true))

    fireEvent.keyDown(backgroundFilter, { key: "Escape", code: "Escape" })

    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("reports a failed shortcut instead of silently ignoring it", async () => {
    mocks.mutateAsync.mockRejectedValue(new Error("request failed"))
    render(
      <TransactionDetailsModal
        transaction={transaction}
        open
        onOpenChange={vi.fn()}
        totalTransactions={1}
        currentTransactionIndex={0}
        onNextTransaction={vi.fn()}
        onPreviousTransaction={vi.fn()}
      />
    )

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "2" })

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Could not categorize this transaction",
        variant: "destructive"
      })
    )
  })

  it("does not categorize from shortcuts while the modal is closed", () => {
    render(
      <TransactionDetailsModal
        transaction={transaction}
        open={false}
        onOpenChange={vi.fn()}
        totalTransactions={1}
        currentTransactionIndex={0}
        onNextTransaction={vi.fn()}
        onPreviousTransaction={vi.fn()}
      />
    )

    fireEvent.keyDown(window, { key: "1", code: "Digit1" })

    expect(mocks.mutateAsync).not.toHaveBeenCalled()
  })
})
