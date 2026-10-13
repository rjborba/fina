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
const cardOptions = [
  {
    id: "70",
    accountId: "20",
    accountName: "Credit card",
    name: "Main physical",
    last4: "0042",
    archived: false,
    groupId: "10",
    createdAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "80",
    accountId: "21",
    accountName: "Travel credit",
    name: "Travel virtual",
    last4: null,
    archived: false,
    groupId: "10",
    createdAt: "2026-06-01T00:00:00.000Z"
  }
]

vi.mock("@/data/creditCards/useCreditCards", () => ({
  useCreditCards: ({ accountId }: { accountId?: string }) => ({
    data: cardOptions.filter((card) => card.accountId === accountId),
    isLoading: false,
    isError: false
  })
}))

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

  it("creates a purchase with its selected card ID and retains attribution after a failed save", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    mutateAsync.mockRejectedValueOnce(new Error("Synthetic request failure"))
    render(<CreateTransactionModal open onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole("combobox", { name: "Account" }))
    await user.click(screen.getByRole("option", { name: "Credit card" }))
    await user.click(screen.getByRole("combobox", { name: "Purchase card" }))
    await user.click(
      screen.getByRole("option", { name: "Main physical · ••0042" })
    )
    await user.click(screen.getByLabelText("Bill due in"))
    await user.click(
      screen.getByRole("button", {
        name: `October ${new Date().getFullYear()}`
      })
    )
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Synthetic purchase" }
    })
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "-10" }
    })
    await user.click(screen.getByRole("button", { name: "Create Transaction" }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bankaccountId: "20",
        creditCardId: "70",
        value: -10
      })
    )
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(
      screen.getByRole("combobox", { name: "Purchase card" })
    ).toHaveTextContent("Main physical · ••0042")
    await user.click(screen.getByRole("button", { name: "Create Transaction" }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(mutateAsync).toHaveBeenCalledTimes(2)
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ creditCardId: "70" })
    )
  })

  it.each(["Travel credit", "Checking"])(
    "clears the selected card when switching the purchase account to %s",
    async (destination) => {
      const user = userEvent.setup()
      render(<CreateTransactionModal open />)
      await user.click(screen.getByRole("combobox", { name: "Account" }))
      await user.click(screen.getByRole("option", { name: "Credit card" }))
      await user.click(screen.getByRole("combobox", { name: "Purchase card" }))
      await user.click(
        screen.getByRole("option", { name: "Main physical · ••0042" })
      )
      await user.click(screen.getByRole("combobox", { name: "Account" }))
      await user.click(screen.getByRole("option", { name: destination }))
      if (destination === "Travel credit") {
        expect(
          screen.getByRole("combobox", { name: "Purchase card" })
        ).toHaveTextContent("Not identified")
        await user.click(
          screen.getByRole("combobox", { name: "Purchase card" })
        )
        expect(
          screen.queryByRole("option", { name: "Main physical · ••0042" })
        ).not.toBeInTheDocument()
        expect(
          screen.getByRole("option", { name: "Travel virtual" })
        ).toBeVisible()
        await user.keyboard("{Escape}")
        await user.click(screen.getByLabelText("Bill due in"))
        await user.click(
          screen.getByRole("button", {
            name: `October ${new Date().getFullYear()}`
          })
        )
      } else {
        expect(
          screen.queryByRole("combobox", { name: "Purchase card" })
        ).not.toBeInTheDocument()
      }
      fireEvent.change(screen.getByLabelText("Description"), {
        target: { value: "Synthetic switched purchase" }
      })
      await user.click(
        screen.getByRole("button", { name: "Create Transaction" })
      )
      await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
      expect(mutateAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({
          bankaccountId: destination === "Travel credit" ? "21" : "22",
          creditCardId: null
        })
      )
    }
  )

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
