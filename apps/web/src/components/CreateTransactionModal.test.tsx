// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react"
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

import { CreateTransactionModal } from "./CreateTransactionModal"

const mutateAsync = vi.fn()
vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({
    selectedGroup: { id: "10", name: "Test" }
  })
}))

vi.mock("@/data/creditCardBills/useCreditCardBills", () => ({
  useCreditCardBill: () => ({ data: undefined, isLoading: false })
}))

vi.mock("@/data/bankAccounts/useBankAccounts", () => ({
  useBankAccounts: () => ({
    data: [
      {
        id: "20",
        name: "Credit card",
        type: "credit",
        institutionId: "nubank",
        dueDate: 5
      },
      {
        id: "21",
        name: "Travel credit",
        type: "credit",
        institutionId: null,
        dueDate: 10
      },
      {
        id: "22",
        name: "Checking",
        type: "checkout",
        institutionId: null,
        dueDate: null
      }
    ]
  })
}))

vi.mock("@/data/categories/useCategories", () => ({
  useCategories: () => ({ data: [] })
}))

vi.mock("@/data/transactions/useTransactionsMutation", () => ({
  useTransactionMutation: () => ({ addMutation: { mutateAsync } })
}))

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }))

describe("CreateTransactionModal", () => {
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

  it("creates a purchase with plain card metadata and retains entered values after a failed save", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    mutateAsync.mockRejectedValueOnce(new Error("Synthetic request failure"))
    render(<CreateTransactionModal open onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole("combobox", { name: "Account" }))
    await user.click(screen.getByRole("option", { name: "Credit card" }))
    await user.type(screen.getByLabelText("Card name"), "Main physical")
    await user.type(screen.getByLabelText("Last four digits"), "0042")
    await user.click(screen.getByLabelText("Bill due in"))
    await user.click(
      screen.getByRole("button", {
        name: `October ${new Date().getFullYear()}`
      })
    )
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Synthetic purchase" }
    })
    await user.click(screen.getByRole("button", { name: "Create Transaction" }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bankaccountId: "20",
        cardName: "Main physical",
        cardLast4: "0042"
      })
    )
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Card name")).toHaveValue("Main physical")
    expect(screen.getByLabelText("Last four digits")).toHaveValue("0042")
    await user.click(screen.getByRole("button", { name: "Create Transaction" }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("clears card metadata when switching to a checking account", async () => {
    const user = userEvent.setup()
    render(<CreateTransactionModal open />)
    await user.click(screen.getByRole("combobox", { name: "Account" }))
    await user.click(screen.getByRole("option", { name: "Credit card" }))
    await user.type(screen.getByLabelText("Card name"), "Personal")
    await user.type(screen.getByLabelText("Last four digits"), "0042")
    await user.click(screen.getByRole("combobox", { name: "Account" }))
    await user.click(screen.getByRole("option", { name: "Checking" }))
    expect(screen.queryByLabelText("Card name")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Create Transaction" }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bankaccountId: "22",
        cardName: null,
        cardLast4: null
      })
    )
  })

  afterEach(cleanup)

  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({ id: "30" })
  })

  it("keeps a card bill’s due month separate from its default review month", async () => {
    render(<CreateTransactionModal open />)

    await userEvent.click(screen.getByRole("combobox", { name: "Account" }))
    await userEvent.click(
      await screen.findByRole("option", { name: "Credit card" })
    )
    expect(
      screen
        .getByRole("combobox", { name: "Account" })
        .querySelector('[data-institution-id="nubank"] img')
    ).not.toBeNull()

    const currentYear = new Date().getFullYear()
    const billMonth = screen.getByLabelText("Bill due in")
    expect(billMonth).toHaveTextContent("Choose month")
    await userEvent.click(billMonth)
    await userEvent.click(
      screen.getByRole("button", { name: `October ${currentYear}` })
    )
    expect(
      screen.queryByLabelText("Include in monthly review")
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Synthetic transaction" }
    })
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "10" }
    })
    await userEvent.click(
      screen.getByRole("button", { name: "Create Transaction" })
    )

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        bankaccountId: "20",
        billMonth: `${currentYear}-10`
      })
    )
    expect(mutateAsync.mock.calls[0]?.[0]).not.toHaveProperty("reviewMonth")
  })
})
