// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react"
import type { BankaccountOutput } from "@fina/types"
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
  updateInstitution: vi.fn(),
  bankAccounts: [] as BankaccountOutput[],
  toast: vi.fn()
}))

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => mocks.activeGroup
}))

vi.mock("@/data/bankAccounts/useBankAccounts", () => ({
  useBankAccounts: () => ({ data: mocks.bankAccounts })
}))

vi.mock("@/data/bankAccounts/useBankAccountsMutation", () => ({
  useAccountsMutation: () => ({
    addAccount: mocks.addAccount,
    removeAccount: mocks.removeAccount,
    updateInstitution: mocks.updateInstitution
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
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
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
    mocks.updateInstitution.mockReset()
    mocks.updateInstitution.mockResolvedValue(undefined)
    mocks.bankAccounts = []
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
    await user.click(
      screen.getByRole("combobox", {
        name: "Financial institution"
      })
    )
    await user.type(
      screen.getByRole("combobox", {
        name: "Search financial institutions"
      }),
      "inter"
    )
    await user.click(screen.getByRole("option", { name: "Inter" }))
    await user.click(screen.getByRole("button", { name: "Add account" }))

    await waitFor(() =>
      expect(mocks.addAccount).toHaveBeenCalledWith({
        name: "Banco Inter",
        type: "checkout",
        groupId: "1",
        dueDate: null,
        institutionId: "inter"
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
    await user.click(screen.getByRole("combobox", { name: "Card issuer" }))
    await user.click(screen.getByRole("option", { name: "Nubank" }))
    await user.type(screen.getByRole("spinbutton", { name: "Due day" }), "5")
    await user.click(screen.getByRole("button", { name: "Add account" }))

    await waitFor(() =>
      expect(mocks.addAccount).toHaveBeenCalledWith({
        name: "Main card",
        type: "credit",
        groupId: "1",
        dueDate: 5,
        institutionId: "nubank"
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

  it("asks for an institution even when the account name resembles a known bank", async () => {
    const user = userEvent.setup()
    render(<Accounts />)
    await user.type(
      screen.getByRole("textbox", { name: "Account name" }),
      "Itaú household"
    )
    await user.click(screen.getByRole("button", { name: "Add account" }))
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Financial institution" })
      ).toHaveAccessibleDescription(/Choose a financial institution/)
    )
    expect(mocks.addAccount).not.toHaveBeenCalled()
  })

  it("allows an explicit Other choice without guessing from the account name", async () => {
    const user = userEvent.setup()
    render(<Accounts />)
    await user.type(
      screen.getByRole("textbox", { name: "Account name" }),
      "Banco Inter custom account"
    )
    await user.click(
      screen.getByRole("combobox", {
        name: "Financial institution"
      })
    )
    await user.click(screen.getByRole("option", { name: "Other / not listed" }))
    await user.click(screen.getByRole("button", { name: "Add account" }))
    await waitFor(() =>
      expect(mocks.addAccount).toHaveBeenCalledWith({
        name: "Banco Inter custom account",
        type: "checkout",
        groupId: "1",
        dueDate: null,
        institutionId: null
      })
    )
  })

  it("shows saved logos for existing checking and credit card accounts", () => {
    mocks.bankAccounts = [
      account({ name: "Household checking", institutionId: "inter" }),
      account({
        id: "2",
        name: "Family card",
        type: "credit",
        dueDate: 10,
        institutionId: "nubank"
      })
    ]
    render(<Accounts />)
    expect(screen.getByAltText("Inter logo")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Nubank logo" })).toBeInTheDocument()
    expect(screen.getByText("Credit card · Nubank")).toBeInTheDocument()
  })

  it("changes only the existing account's institution and keeps its history settings", async () => {
    mocks.bankAccounts = [
      account({
        name: "Family card",
        type: "credit",
        dueDate: 10,
        institutionId: "nubank"
      })
    ]
    const user = userEvent.setup()
    render(<Accounts />)
    await user.click(
      screen.getByRole("button", { name: "Change institution for Family card" })
    )
    const dialog = screen.getByRole("dialog", {
      name: "Change financial institution"
    })
    await user.click(
      within(dialog).getByRole("combobox", {
        name: "Financial institution"
      })
    )
    await user.click(screen.getByRole("option", { name: "Itaú" }))
    await user.click(
      within(dialog).getByRole("button", { name: "Save institution" })
    )
    await waitFor(() =>
      expect(mocks.updateInstitution).toHaveBeenCalledWith({
        id: "1",
        institutionId: "itau"
      })
    )
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Change financial institution"
        })
      ).not.toBeInTheDocument()
    )
    expect(screen.getByText("Family card")).toBeInTheDocument()
    expect(mocks.bankAccounts[0]?.dueDate).toBe(10)
  })

  it("keeps a failed institution change open and retryable without changing the displayed logo", async () => {
    mocks.bankAccounts = [
      account({ name: "Main bank", institutionId: "inter" })
    ]
    mocks.updateInstitution.mockRejectedValueOnce(new Error("Request failed"))
    const user = userEvent.setup()
    render(<Accounts />)
    await user.click(
      screen.getByRole("button", { name: "Change institution for Main bank" })
    )
    const dialog = screen.getByRole("dialog", {
      name: "Change financial institution"
    })
    await user.click(
      within(dialog).getByRole("combobox", {
        name: "Financial institution"
      })
    )
    await user.click(screen.getByRole("option", { name: "Other / not listed" }))
    await user.click(
      within(dialog).getByRole("button", { name: "Save institution" })
    )
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Could not update the financial institution",
        variant: "destructive"
      })
    )
    expect(dialog).toBeInTheDocument()
    expect(screen.getByAltText("Inter logo")).toBeInTheDocument()
    await user.click(
      within(dialog).getByRole("button", { name: "Save institution" })
    )
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Change financial institution"
        })
      ).not.toBeInTheDocument()
    )
  })

  it("shows credit accounts without separate card management", () => {
    mocks.bankAccounts = [
      account({ id: "2", name: "Family credit", type: "credit", dueDate: 10 })
    ]
    render(<Accounts />)
    expect(screen.getByText("Family credit")).toBeVisible()
    expect(
      screen.queryByRole("button", {
        name: /Cards for|Add card|Show archived|Unarchive/
      })
    ).not.toBeInTheDocument()
  })
})

function account(
  overrides: Partial<BankaccountOutput> = {}
): BankaccountOutput {
  return {
    id: "1",
    name: "Main checking",
    type: "checkout",
    dueDate: null,
    institutionId: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    groupId: "1",
    userId: "11111111-1111-4111-8111-111111111111",
    ...overrides
  }
}
