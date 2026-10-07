// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
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

const transaction: TransactionOutput = {
  id: "7",
  createdAt: "2026-09-27T00:00:00.000Z",
  description: "Historical transaction",
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

  it("changes a checking transaction’s review month without changing its dates or value", async () => {
    render(
      <TransactionDetailsModal
        transaction={{
          ...transaction,
          bankaccount: {
            id: "20",
            name: "Checking",
            type: "checkout",
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
    fireEvent.change(screen.getByLabelText("Reference month"), {
      target: { value: "2026-08" }
    })
    fireEvent.click(
      screen.getByRole("button", { name: "Save reference month" })
    )
    await waitFor(() =>
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        id: "7",
        transaction: { reviewMonth: "2026-08" }
      })
    )
    expect(
      screen.getByText(/transaction date and cash flow stay unchanged/)
    ).toBeVisible()
  })

  it("links card purchases to the whole-bill editor without an individual month override", () => {
    render(
      <TransactionDetailsModal
        transaction={{
          ...transaction,
          creditDueDate: "2026-07-10",
          bankaccount: { id: "21", name: "Card", type: "credit", dueDate: 10 }
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
      screen.getByRole("link", { name: "Change month for the whole bill" })
    ).toHaveAttribute("href", "/credit-card-bills/21/2026-07")
    expect(screen.queryByLabelText("Reference month")).not.toBeInTheDocument()
  })

  it("categorizes with number keys and shows the available shortcut range", async () => {
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

    expect(screen.getByText("Keys 1–2 · 0 clears")).toBeInTheDocument()
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
