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
import type { BankaccountOutput, CreditCardOutput } from "@fina/types"
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
  creditCardsQuery: vi.fn(),
  cards: [] as CreditCardOutput[],
  addCard: vi.fn(),
  updateCard: vi.fn(),
  archiveCard: vi.fn(),
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
vi.mock("@/data/creditCards/useCreditCards", () => ({
  useCreditCards: mocks.creditCardsQuery
}))
vi.mock("@/data/creditCards/useCreditCardsMutation", () => ({
  useCreditCardsMutation: () => ({
    addMutation: { mutateAsync: mocks.addCard },
    updateMutation: { mutateAsync: mocks.updateCard },
    archiveMutation: { mutateAsync: mocks.archiveCard }
  })
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
    mocks.cards = []
    mocks.creditCardsQuery.mockReset()
    mocks.creditCardsQuery.mockImplementation(() => ({
      data: mocks.cards,
      isLoading: false,
      isError: false
    }))
    mocks.addCard.mockReset()
    mocks.addCard.mockResolvedValue(undefined)
    mocks.updateCard.mockReset()
    mocks.updateCard.mockResolvedValue(undefined)
    mocks.archiveCard.mockReset()
    mocks.archiveCard.mockResolvedValue(undefined)
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

  it("fetches cards once for the group and manages only credit-account children", async () => {
    mocks.bankAccounts = [
      account(),
      account({ id: "2", name: "Family credit", type: "credit", dueDate: 10 }),
      account({ id: "3", name: "Other credit", type: "credit", dueDate: 20 })
    ]
    mocks.cards = [
      card({ accountId: "2", name: "Main physical", last4: "0042" }),
      card({ id: "11", accountId: "2", name: "Online virtual", last4: null }),
      card({ id: "12", accountId: "3", name: "Additional family" })
    ]
    const user = userEvent.setup()
    render(<Accounts />)
    expect(mocks.creditCardsQuery).toHaveBeenCalledWith({
      groupId: "1",
      includeArchived: true
    })
    expect(
      screen.queryByRole("button", { name: "Cards for Main checking" })
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: "Cards for Family credit" })
    )
    const cards = screen.getByRole("list", { name: "Cards on Family credit" })
    expect(cards).toHaveTextContent("Main physical · ••0042")
    expect(cards).toHaveTextContent("Online virtual")
    expect(cards).not.toHaveTextContent("Additional family")
    expect(
      screen.getByText(
        "One shared bill and due day for all cards on this account."
      )
    ).toBeVisible()
  })

  it("adds a named card without account-group overrides and preserves leading-zero last digits", async () => {
    mocks.bankAccounts = [
      account({ id: "2", name: "Family credit", type: "credit", dueDate: 10 })
    ]
    const user = userEvent.setup()
    render(<Accounts />)
    await user.click(
      screen.getByRole("button", { name: "Cards for Family credit" })
    )
    await user.click(
      screen.getByRole("button", { name: "Add card to Family credit" })
    )
    const dialog = screen.getByRole("dialog", { name: "Add card" })
    expect(within(dialog).getAllByRole("textbox")).toHaveLength(2)
    await user.type(
      within(dialog).getByRole("textbox", { name: "Card nickname" }),
      "  Online virtual  "
    )
    await user.type(
      within(dialog).getByRole("textbox", { name: "Last 4 digits (optional)" }),
      "0042"
    )
    await user.click(within(dialog).getByRole("button", { name: "Add card" }))
    await waitFor(() =>
      expect(mocks.addCard).toHaveBeenCalledWith({
        accountId: "2",
        name: "Online virtual",
        last4: "0042"
      })
    )
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Add card" })
      ).not.toBeInTheDocument()
    )
  })

  it("rejects incomplete or excessive card digits and never submits them", async () => {
    mocks.bankAccounts = [
      account({ id: "2", name: "Family credit", type: "credit", dueDate: 10 })
    ]
    const user = userEvent.setup()
    render(<Accounts />)
    await user.click(
      screen.getByRole("button", { name: "Cards for Family credit" })
    )
    await user.click(
      screen.getByRole("button", { name: "Add card to Family credit" })
    )
    const dialog = screen.getByRole("dialog", { name: "Add card" })
    const submit = within(dialog).getByRole("button", {
      name: "Add card"
    })
    await user.click(submit)
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Card nickname is required"
    )
    await user.type(
      within(dialog).getByRole("textbox", { name: "Card nickname" }),
      "Physical"
    )
    const digits = within(dialog).getByRole("textbox", {
      name: "Last 4 digits (optional)"
    })
    for (const invalid of ["123", "12345", "12ab", "1".repeat(16)]) {
      await user.clear(digits)
      await user.type(digits, invalid)
      await user.click(submit)
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "Enter exactly four digits"
      )
      expect(mocks.addCard).not.toHaveBeenCalled()
    }
    await user.clear(digits)
    const nickname = within(dialog).getByRole("textbox", {
      name: "Card nickname"
    })
    await user.clear(nickname)
    await user.type(nickname, "1".repeat(16))
    await user.click(submit)
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "never a full card number"
    )
    expect(mocks.addCard).not.toHaveBeenCalled()
    await user.clear(nickname)
    await user.type(nickname, "Physical")
    await user.click(submit)
    await waitFor(() =>
      expect(mocks.addCard).toHaveBeenCalledWith({
        accountId: "2",
        name: "Physical",
        last4: null
      })
    )
  })

  it("blocks duplicate saves and dismissal while a card save is pending", async () => {
    mocks.bankAccounts = [
      account({ id: "2", name: "Family credit", type: "credit", dueDate: 10 })
    ]
    let completeSave!: () => void
    mocks.addCard.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          completeSave = resolve
        })
    )
    const user = userEvent.setup()
    render(<Accounts />)
    await user.click(
      screen.getByRole("button", { name: "Cards for Family credit" })
    )
    await user.click(
      screen.getByRole("button", { name: "Add card to Family credit" })
    )
    const dialog = screen.getByRole("dialog", { name: "Add card" })
    await user.type(
      within(dialog).getByRole("textbox", { name: "Card nickname" }),
      "Virtual"
    )
    await user.click(within(dialog).getByRole("button", { name: "Add card" }))
    expect(dialog).toHaveAttribute("aria-busy", "true")
    expect(
      within(dialog).getByRole("button", { name: "Saving..." })
    ).toBeDisabled()
    expect(
      within(dialog).getByRole("button", { name: "Cancel" })
    ).toBeDisabled()
    expect(
      within(dialog).getByRole("textbox", { name: "Card nickname" })
    ).toBeDisabled()
    await user.keyboard("{Escape}")
    expect(dialog).toBeInTheDocument()
    expect(mocks.addCard).toHaveBeenCalledTimes(1)
    await act(async () => completeSave())
    expect(
      screen.queryByRole("dialog", { name: "Add card" })
    ).not.toBeInTheDocument()
  })

  it("keeps failed card edits open and sends only editable fields on retry", async () => {
    mocks.bankAccounts = [
      account({ id: "2", name: "Family credit", type: "credit", dueDate: 10 })
    ]
    mocks.cards = [
      card({ accountId: "2", name: "Main physical", last4: "0042" })
    ]
    mocks.updateCard.mockRejectedValueOnce(new Error("Update failed"))
    const user = userEvent.setup()
    render(<Accounts />)
    await user.click(
      screen.getByRole("button", { name: "Cards for Family credit" })
    )
    await user.click(
      screen.getByRole("button", { name: "Actions for Main physical" })
    )
    await user.click(screen.getByRole("menuitem", { name: "Edit card" }))
    const dialog = screen.getByRole("dialog", {
      name: "Edit card"
    })
    const name = within(dialog).getByRole("textbox", { name: "Card nickname" })
    await user.clear(name)
    await user.type(name, "Renamed physical")
    await user.click(within(dialog).getByRole("button", { name: "Save card" }))
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Could not save the card"
    )
    expect(dialog).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Save card" }))
    await waitFor(() =>
      expect(mocks.updateCard).toHaveBeenLastCalledWith({
        id: "10",
        name: "Renamed physical",
        last4: "0042"
      })
    )
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Edit card" })
      ).not.toBeInTheDocument()
    )
  })

  it("confirms archiving with history retained and keeps failures retryable", async () => {
    mocks.bankAccounts = [
      account({ id: "2", name: "Family credit", type: "credit", dueDate: 10 })
    ]
    mocks.cards = [
      card({ accountId: "2", name: "Additional family" }),
      card({ id: "11", accountId: "2", name: "Old virtual", archived: true })
    ]
    mocks.archiveCard.mockRejectedValueOnce(new Error("Archive failed"))
    const user = userEvent.setup()
    render(<Accounts />)
    await user.click(
      screen.getByRole("button", { name: "Cards for Family credit" })
    )
    expect(screen.queryByText("Old virtual")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Show archived (1)" }))
    expect(screen.getByText("Old virtual")).toBeVisible()
    expect(
      screen.queryByRole("button", { name: "Actions for Old virtual" })
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: "Actions for Additional family" })
    )
    await user.click(screen.getByRole("menuitem", { name: "Archive card" }))
    const confirmation = screen.getByRole("alertdialog", {
      name: "Archive Additional family?"
    })
    expect(confirmation).toHaveTextContent(
      "Existing transaction links and the account's combined bill will be retained"
    )
    expect(mocks.archiveCard).not.toHaveBeenCalled()
    await user.click(
      within(confirmation).getByRole("button", { name: "Archive card" })
    )
    expect(within(confirmation).getByRole("alert")).toHaveTextContent(
      "Could not archive the card"
    )
    await user.click(
      within(confirmation).getByRole("button", { name: "Archive card" })
    )
    await waitFor(() =>
      expect(mocks.archiveCard).toHaveBeenLastCalledWith("10")
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
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

function card(overrides: Partial<CreditCardOutput> = {}): CreditCardOutput {
  return {
    id: "10",
    createdAt: "2026-10-01T00:00:00.000Z",
    groupId: "1",
    accountId: "2",
    accountName: "Family credit",
    name: "Main physical",
    last4: null,
    archived: false,
    ...overrides
  }
}
