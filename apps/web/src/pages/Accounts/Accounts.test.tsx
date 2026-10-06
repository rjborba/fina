// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
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

import { Accounts } from "./Accounts"

const mocks = vi.hoisted(() => ({
  activeGroup: {
    selectedGroup: {
      id: "1",
      createdAt: "2026-09-27T00:00:00.000Z",
      name: "My finances",
      isOwner: true
    } as
      | {
          id: string
          createdAt: string
          name: string
          isOwner: boolean
        }
      | undefined,
    isGroupsLoading: false
  },
  addAccount: vi.fn(),
  removeAccount: vi.fn(),
  toast: vi.fn()
}))

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => mocks.activeGroup
}))

vi.mock("@/data/bankAccounts/useBankAccounts", () => ({
  useBankAccounts: () => ({ data: [] })
}))

vi.mock("@/data/bankAccounts/useBankAccountsMutation", () => ({
  useAccountsMutation: () => ({
    addAccount: mocks.addAccount,
    removeAccount: mocks.removeAccount
  })
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast })
}))

describe("Accounts", () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => undefined
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
  })

  beforeEach(() => {
    mocks.activeGroup.selectedGroup = {
      id: "1",
      createdAt: "2026-09-27T00:00:00.000Z",
      name: "My finances",
      isOwner: true
    }
    mocks.activeGroup.isGroupsLoading = false
    mocks.addAccount.mockReset()
    mocks.addAccount.mockResolvedValue(undefined)
    mocks.removeAccount.mockReset()
    mocks.toast.mockReset()
  })

  afterEach(cleanup)

  it("submits a checking account for the active group", async () => {
    const user = userEvent.setup()
    render(<Accounts />)

    await user.type(
      screen.getByRole("textbox", { name: "Account name" }),
      "Banco Inter"
    )
    await user.click(screen.getByRole("button", { name: "Add account" }))

    await waitFor(() =>
      expect(mocks.addAccount).toHaveBeenCalledWith({
        name: "Banco Inter",
        type: "checkout",
        groupId: "1",
        dueDate: null
      })
    )
    expect(mocks.toast).toHaveBeenCalledWith({ title: "Successfully added" })
  })

  it("submits only the due day for a credit card account", async () => {
    const user = userEvent.setup()
    render(<Accounts />)

    await user.type(
      screen.getByRole("textbox", { name: "Account name" }),
      "Main card"
    )
    await user.click(screen.getByRole("combobox", { name: "Account type" }))
    await user.click(screen.getByRole("option", { name: "Credit card" }))
    await user.type(screen.getByRole("spinbutton", { name: "Due day" }), "5")
    await user.click(screen.getByRole("button", { name: "Add account" }))

    await waitFor(() =>
      expect(mocks.addAccount).toHaveBeenCalledWith({
        name: "Main card",
        type: "credit",
        groupId: "1",
        dueDate: 5
      })
    )
  })

  it("shows a validation error instead of silently rejecting an empty name", async () => {
    const user = userEvent.setup()
    render(<Accounts />)

    await user.click(screen.getByRole("button", { name: "Add account" }))

    expect(
      await screen.findByText("Account name is required")
    ).toBeInTheDocument()
    expect(mocks.addAccount).not.toHaveBeenCalled()
  })

  it("does not enable account creation without an active workspace", () => {
    mocks.activeGroup.selectedGroup = undefined
    render(<Accounts />)

    expect(
      screen.getByRole("button", { name: "No active workspace" })
    ).toBeDisabled()
  })
})
