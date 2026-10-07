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
    selectedGroup: { id: "10", name: "Test", creditCardReviewMonthOffset: -1 }
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
        dueDate: 5
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

    const currentYear = new Date().getFullYear()
    const billMonth = screen.getByLabelText("Bill due in")
    expect(billMonth).toHaveTextContent("Choose month")
    await userEvent.click(billMonth)
    await userEvent.click(
      screen.getByRole("button", { name: `October ${currentYear}` })
    )
    expect(
      screen.getByLabelText("Include in monthly review")
    ).toHaveTextContent(`September ${currentYear}`)
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
        billMonth: `${currentYear}-10`,
        reviewMonth: `${currentYear}-09`
      })
    )
  })
})
