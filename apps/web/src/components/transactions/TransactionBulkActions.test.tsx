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
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { TransactionBulkActions } from "./TransactionBulkActions"

const categories = [
  {
    id: "20",
    name: "Groceries",
    icon: "shopping-cart" as const,
    color: "lime" as const
  },
  {
    id: "21",
    name: "Transport",
    icon: "car" as const,
    color: "sky" as const
  }
]

const defaultProps = () => ({
  selectedCount: 2,
  selectableCount: 12,
  selectedTotal: -35.5,
  unavailableValueCount: 0,
  categories,
  allSelected: false,
  isDeleting: false,
  isUpdatingCategory: false,
  onSelectAll: vi.fn(),
  onClearSelection: vi.fn(),
  onDelete: vi.fn().mockResolvedValue(undefined),
  onAssignCategory: vi.fn().mockResolvedValue(undefined)
})

describe("TransactionBulkActions", () => {
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

  afterEach(() => {
    cleanup()
  })

  it("separates the live selection context from its interactive toolbar", () => {
    render(
      <TransactionBulkActions
        {...defaultProps()}
        selectedCount={3}
        unavailableValueCount={1}
      />
    )

    const toolbar = screen.getByRole("toolbar", {
      name: "Selected transaction actions"
    })
    const summary = within(toolbar).getByRole("status")
    expect(summary).toHaveTextContent("3 selected")
    expect(summary).toHaveTextContent("Net -R$35.50")
    expect(summary).toHaveTextContent("1 without an amount")
    expect(summary).toHaveAttribute("aria-atomic", "true")
    expect(within(summary).queryByRole("button")).not.toBeInTheDocument()
    expect(toolbar).not.toHaveAttribute("aria-live")
  })

  it("shows signed zero and income totals without inventing missing amounts", () => {
    const props = defaultProps()
    const { rerender } = render(
      <TransactionBulkActions {...props} selectedTotal={0} />
    )
    expect(screen.getByRole("status")).toHaveTextContent("Net R$0.00")
    expect(screen.queryByText(/without an amount/)).not.toBeInTheDocument()

    rerender(<TransactionBulkActions {...props} selectedTotal={18} />)
    expect(screen.getByRole("status")).toHaveTextContent("Net R$18.00")
  })

  it("exposes the loaded-row boundary and can select or clear the view", async () => {
    const user = userEvent.setup()
    const props = defaultProps()
    const { rerender } = render(<TransactionBulkActions {...props} />)
    const selectAll = screen.getByRole("button", { name: "Select all" })
    expect(selectAll).toHaveAttribute(
      "title",
      "Select all 12 loaded transactions in this view"
    )
    await user.click(selectAll)
    await user.click(screen.getByRole("button", { name: "Unselect all" }))
    expect(props.onSelectAll).toHaveBeenCalledOnce()
    expect(props.onClearSelection).toHaveBeenCalledOnce()

    rerender(<TransactionBulkActions {...props} allSelected />)
    expect(selectAll).toBeDisabled()
    expect(screen.getByRole("button", { name: "Unselect all" })).toBeEnabled()
  })

  it("searches categories and closes only after assignment succeeds", async () => {
    const user = userEvent.setup()
    const props = defaultProps()
    let finishAssignment!: () => void
    props.onAssignCategory.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishAssignment = resolve
        })
    )
    render(<TransactionBulkActions {...props} />)

    await user.click(
      screen.getByRole("button", { name: "Category for selected transactions" })
    )
    const popup = screen.getByRole("dialog", {
      name: "Category for selected transactions"
    })
    await user.type(within(popup).getByRole("combobox"), "groc")
    expect(
      within(popup).queryByRole("option", { name: "Transport" })
    ).not.toBeInTheDocument()
    await user.click(within(popup).getByRole("option", { name: "Groceries" }))
    expect(props.onAssignCategory).toHaveBeenCalledWith("20")
    expect(popup).toBeInTheDocument()
    expect(within(popup).getByRole("combobox")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Select all" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Unselect all" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled()

    await act(async () => finishAssignment())
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Category for selected transactions"
        })
      ).not.toBeInTheDocument()
    )
    expect(
      screen.getByRole("button", { name: "Category for selected transactions" })
    ).toBeEnabled()
  })

  it("keeps category choices available after a failure and supports None", async () => {
    const user = userEvent.setup()
    const props = defaultProps()
    props.onAssignCategory.mockRejectedValueOnce(new Error("Assignment failed"))
    render(<TransactionBulkActions {...props} />)

    await user.click(
      screen.getByRole("button", { name: "Category for selected transactions" })
    )
    await user.click(screen.getByRole("option", { name: "Groceries" }))
    const popup = screen.getByRole("dialog", {
      name: "Category for selected transactions"
    })
    expect(within(popup).getByRole("combobox")).toBeEnabled()
    expect(screen.getByRole("status")).toHaveTextContent("2 selected")
    await user.click(within(popup).getByRole("option", { name: "None" }))
    expect(props.onAssignCategory).toHaveBeenLastCalledWith(null)
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
  })

  it.each(["isDeleting", "isUpdatingCategory"] as const)(
    "disables every action while %s is pending",
    (pendingProp) => {
      render(
        <TransactionBulkActions
          {...defaultProps()}
          {...{ [pendingProp]: true }}
        />
      )
      const toolbar = screen.getByRole("toolbar")
      expect(toolbar).toHaveAttribute("aria-busy", "true")
      for (const action of within(toolbar).getAllByRole("button")) {
        expect(action).toBeDisabled()
      }
    }
  )

  it("requires confirmation, explains retained imports, and allows cancellation", async () => {
    const user = userEvent.setup()
    const props = defaultProps()
    render(<TransactionBulkActions {...props} selectedCount={1} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))
    const confirmation = screen.getByRole("alertdialog", {
      name: "Delete 1 transaction?"
    })
    expect(confirmation).toHaveTextContent("Original import files are retained")
    expect(confirmation).toHaveTextContent(
      "does not permanently delete the records"
    )
    expect(props.onDelete).not.toHaveBeenCalled()
    await user.click(
      within(confirmation).getByRole("button", { name: "Cancel" })
    )
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(props.onDelete).not.toHaveBeenCalled()
  })

  it("keeps failed deletion available for retry and closes after success", async () => {
    const user = userEvent.setup()
    const props = defaultProps()
    props.onDelete.mockRejectedValueOnce(new Error("Deletion failed"))
    render(<TransactionBulkActions {...props} />)
    await user.click(screen.getByRole("button", { name: "Delete" }))
    await user.click(screen.getByRole("button", { name: "Delete selected" }))
    expect(props.onDelete).toHaveBeenCalledOnce()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()

    let finishDelete!: () => void
    props.onDelete.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishDelete = resolve
        })
    )
    await user.click(screen.getByRole("button", { name: "Delete selected" }))
    const confirmation = screen.getByRole("alertdialog")
    expect(
      within(confirmation).getByRole("button", { name: "Cancel" })
    ).toBeDisabled()
    expect(
      within(confirmation).getByRole("button", { name: "Deleting..." })
    ).toBeDisabled()
    await act(async () => finishDelete())
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(props.onDelete).toHaveBeenCalledTimes(2)
  })
})
