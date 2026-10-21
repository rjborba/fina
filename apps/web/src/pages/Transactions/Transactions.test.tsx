// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  render,
  screen,
  within,
  fireEvent,
  waitFor
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {
  CreditCardBillListQuery,
  CreditCardBillSummary,
  QueryTransactionInputDto,
  TransactionOutput
} from "@fina/types"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"
import { MemoryRouter } from "react-router"
import type { ReactNode } from "react"

import { transactionFiltersStorageKey } from "@/data/transactions/transactionFilterStorage"
import type { TransactionFilterType } from "@/data/transactions/TransactionFilterAtom"
import {
  DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
  type TransactionDisplayProperties
} from "@/components/transactions/transactionDisplay"
import { Transactions } from "./Transactions"

type TransactionQuery = QueryTransactionInputDto & {
  startDate: Date
  endDate: Date
}
type SavedFilter = Omit<TransactionFilterType, "startDate" | "endDate"> & {
  startDate: string
  endDate: string
}

const mocks = vi.hoisted(() => ({
  updateTransaction: vi.fn(),
  removeTransactions: vi.fn(),
  includePayment: false,
  changedBill: false,
  omitCardPurchases: false,
  userId: "fixture-user" as string | null,
  groupId: "group-1" as string | null,
  billQueries: [] as CreditCardBillListQuery[],
  transactionQueries: [] as Array<TransactionQuery & { enabled: boolean }>
}))

const marchFilters = {
  startDate: "2026-03-01",
  endDate: "2026-03-31",
  partialDescription: "",
  categoriesId: [] as string[]
}

function seedFilters(
  filters: SavedFilter = marchFilters,
  userId = "fixture-user",
  groupId = "group-1"
) {
  localStorage.setItem(
    transactionFiltersStorageKey(userId, groupId),
    JSON.stringify(filters)
  )
}

function storedFilters(userId = "fixture-user", groupId = "group-1") {
  return JSON.parse(
    localStorage.getItem(transactionFiltersStorageKey(userId, groupId)) ||
      "null"
  )
}

async function selectReviewMonth(label: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: "Review months" }))
  const picker = screen.getByRole("dialog", { name: "Review months" })
  const target = within(picker).getByRole("button", { name: label })
  if (target.getAttribute("aria-pressed") !== "true") await user.click(target)
  for (const selected of within(picker).getAllByRole("button", {
    pressed: true
  })) {
    if (selected !== target) await user.click(selected)
  }
  await user.click(within(picker).getByRole("button", { name: "Done" }))
}

async function openFilterProperty(
  user: ReturnType<typeof userEvent.setup>,
  property: string
) {
  if (!screen.queryByRole("dialog", { name: "Transaction filters" }))
    await user.click(screen.getByRole("button", { name: /^Filter(?: \d+)?$/ }))
  const back = screen.queryByRole("button", {
    name: "Back to filter properties"
  })
  if (back) await user.click(back)
  await user.click(screen.getByRole("button", { name: property }))
}

function localDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-")
}

function expectInitialQuery(filters: typeof marchFilters, groupId = "group-1") {
  const enabledQueries = mocks.transactionQueries.filter(
    (query) => query.enabled
  )
  expect(enabledQueries.length).toBeGreaterThan(0)
  for (const query of enabledQueries) {
    expect(query).toEqual(
      expect.objectContaining({
        groupId,
        search: filters.partialDescription || undefined,
        categoryIdList: filters.categoriesId
      })
    )
    expect(localDate(query.startDate)).toBe(filters.startDate)
    expect(localDate(query.endDate)).toBe(filters.endDate)
  }
}

const checkingTransaction = {
  id: "checking-transaction",
  flagged: false,
  cardName: null,
  cardLast4: null,
  createdAt: "2026-02-10T00:00:00.000Z",
  description: "Checking purchase",
  value: -40,
  date: "2026-02-10T00:00:00.000Z",
  installmentTotal: null,
  installmentCurrent: null,
  creditDueDate: null,
  observation: null,
  toBeConsideredAt: null,
  calculatedDate: "2026-02-10",
  billPayment: null,
  reviewMonth: "2026-02",
  cashFlowDate: "2026-02-10",
  cashFlowStatus: "confirmed",
  bankaccount: {
    id: "checking-account",
    name: "Checking",
    type: "checkout",
    institutionId: null,
    dueDate: null
  },
  category: null,
  group: { id: "group-1", name: "Household" },
  import: null
} satisfies TransactionOutput

const creditTransaction = {
  ...checkingTransaction,
  id: "credit-transaction",
  description: "Card purchase",
  bankaccount: {
    id: "credit-account",
    name: "Main card",
    type: "credit",
    institutionId: null,
    dueDate: 5
  },
  creditDueDate: "2026-03-05",
  cashFlowDate: "2026-03-05",
  cashFlowStatus: "scheduled"
} satisfies TransactionOutput

const bill = {
  accountId: "credit-account",
  accountName: "Main card",
  accountInstitutionId: null,
  billMonth: "2026-03",
  reviewMonth: "2026-02",
  cashFlowDate: "2026-03-05",
  dueDate: "2026-03-05",
  transactionCount: 1,
  total: -40,
  status: "needs-reconciliation",
  payment: null
} satisfies CreditCardBillSummary

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({
    selectedGroup: mocks.groupId
      ? { id: mocks.groupId, name: "Household" }
      : undefined
  })
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.userId ? { id: mocks.userId } : null })
}))

vi.mock("@/data/transactions/useTransactionsMutation", () => ({
  useTransactionMutation: () => ({
    updateMutation: { mutateAsync: mocks.updateTransaction },
    removeManyMutation: { mutateAsync: mocks.removeTransactions }
  })
}))

vi.mock("@/data/transactions/useTransactions", () => ({
  useTransactions: (query: TransactionQuery, enabled = true) => {
    mocks.transactionQueries.push({ ...query, enabled })

    if (!enabled) {
      return { data: undefined, isLoading: false, isError: false }
    }

    const data: TransactionOutput[] =
      query.accountType === "checkout" || mocks.omitCardPurchases
        ? [checkingTransaction]
        : [checkingTransaction, creditTransaction]
    if (mocks.includePayment)
      data.push({
        ...checkingTransaction,
        id: "payment",
        description: "Linked payment",
        billPayment: { creditAccountId: "credit-account", billMonth: "2026-01" }
      })

    return {
      data: { data, totalCount: data.length },
      isLoading: false,
      isError: false
    }
  }
}))

vi.mock("@/data/creditCardBills/useCreditCardBills", () => ({
  useCreditCardBills: (query: CreditCardBillListQuery, enabled = true) => {
    if (enabled) mocks.billQueries.push(query)
    return {
      data: enabled
        ? [
            mocks.changedBill
              ? {
                  ...bill,
                  total: -100,
                  status: "needs-review",
                  payment: {
                    transactionId: "payment",
                    accountId: "checking-account",
                    accountName: "Checking",
                    accountInstitutionId: null,
                    description: "Synthetic payment",
                    date: "2026-03-04",
                    value: -40
                  }
                }
              : bill
          ]
        : [],
      isLoading: false,
      isError: false
    }
  }
}))

vi.mock("@/data/categories/useCategories", () => ({
  useCategories: () => ({ data: [] })
}))

vi.mock("@/data/bankAccounts/useBankAccounts", () => ({
  useBankAccounts: () => ({
    data: [
      { id: "11", name: "Fixture checking", type: "checkout" },
      { id: "12", name: "Fixture card", type: "credit" }
    ],
    isLoading: false
  })
}))

vi.mock("@/data/imports/useImports", () => ({
  useImports: () => ({
    data: [{ id: "31", fileName: "Fixture statement.csv", accountId: "12" }],
    isLoading: false
  })
}))

vi.mock("@/components/transactions/TransactionsHeader", () => ({
  TransactionsHeader: ({
    totalCount,
    children
  }: {
    totalCount: number
    children: ReactNode
  }) => (
    <div>
      <div data-testid="visible-entry-count">{totalCount}</div>
      {children}
    </div>
  )
}))

vi.mock("@/components/transactions/TransactionsList", () => ({
  default: ({
    data,
    displayProperties,
    sort
  }: {
    data: TransactionOutput[]
    displayProperties: TransactionDisplayProperties
    sort: string
  }) => (
    <div data-testid="transactions-list">
      <output data-testid="ledger-display-properties" data-sort={sort}>
        {JSON.stringify(displayProperties)}
      </output>
      {data.map((transaction) => (
        <span key={transaction.id}>{transaction.description}</span>
      ))}
    </div>
  )
}))

vi.mock("@/components/transactions/CreditCardBillsLedger", () => ({
  CreditCardBillsLedger: ({
    transactions,
    bills,
    displayProperties,
    sort
  }: {
    transactions: TransactionOutput[]
    bills: CreditCardBillSummary[]
    displayProperties: TransactionDisplayProperties
    sort: string
  }) => (
    <div data-testid="grouped-ledger">
      <output data-testid="ledger-display-properties" data-sort={sort}>
        {JSON.stringify(displayProperties)}
      </output>
      {transactions.map((transaction) => (
        <span key={transaction.id}>{transaction.description}</span>
      ))}
      {bills.map((currentBill) => (
        <span key={currentBill.billMonth}>{currentBill.accountName} bill</span>
      ))}
    </div>
  )
}))

describe("Transactions cash-flow ledger", () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => undefined
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
  })

  beforeEach(() => {
    localStorage.clear()
    mocks.transactionQueries.length = 0
    mocks.billQueries.length = 0
    mocks.includePayment = false
    mocks.changedBill = false
    mocks.omitCardPurchases = false
    mocks.userId = "fixture-user"
    mocks.groupId = "group-1"
    seedFilters()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it.each([
    {
      basis: "monthly-review",
      startDate: "2026-02-01",
      endDate: "2026-02-28"
    },
    {
      basis: "cash-flow",
      startDate: "2026-02-10",
      endDate: "2026-03-20"
    }
  ])(
    "restores the saved $basis period and filters before the first enabled query",
    async ({ basis, startDate, endDate }) => {
      const filters = {
        startDate,
        endDate,
        partialDescription: "Card",
        categoriesId: ["20", "-1"]
      }
      seedFilters(filters)
      localStorage.setItem("ledgerDateBasis:v1", JSON.stringify(basis))
      render(
        <MemoryRouter>
          <Transactions />
        </MemoryRouter>
      )

      expectInitialQuery(filters)
      expect(mocks.transactionQueries[0].dateBasis).toBe(basis)
      expect(screen.getByRole("textbox", { name: "Find in view" })).toHaveValue(
        "Card"
      )
      expect(
        screen.getByRole("button", { name: "Clear category filters" })
      ).toBeVisible()
      if (basis === "monthly-review") {
        expect(
          screen.getByRole("button", { name: "Review months" })
        ).toHaveTextContent("Feb 2026")
      } else {
        expect(
          screen.getByRole("button", { name: "Date range" })
        ).toHaveTextContent("10 Feb – 20 Mar 2026")
        fireEvent.click(screen.getByRole("button", { name: "Next month" }))
        expect(storedFilters()).toEqual({
          ...filters,
          startDate: "2026-03-10",
          endDate: "2026-04-20"
        })
      }
    }
  )

  it("persists chosen months and filter edits, then restores and clears them without resetting the period", async () => {
    const user = userEvent.setup()
    localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')
    const page = (
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    const { unmount } = render(page)
    await selectReviewMonth("February 2026")
    await openFilterProperty(user, "Description")
    await user.type(
      screen.getByRole("textbox", { name: "Search description" }),
      "Card"
    )
    await waitFor(() =>
      expect(mocks.transactionQueries.at(-1)?.search).toBe("Card")
    )
    await openFilterProperty(user, "Category")
    await user.click(screen.getByRole("checkbox", { name: /^None$/ }))
    await user.keyboard("{Escape}")
    const filtered = {
      startDate: "2026-02-01",
      endDate: "2026-02-28",
      reviewMonths: ["2026-02"],
      partialDescription: "Card",
      categoriesId: ["-1"]
    }
    expect(storedFilters()).toEqual(filtered)
    unmount()

    mocks.transactionQueries.length = 0
    render(page)
    expectInitialQuery(filtered)
    expect(
      screen.getByRole("button", { name: "Review months" })
    ).toHaveTextContent("Feb 2026")
    expect(screen.getByRole("textbox", { name: "Find in view" })).toHaveValue(
      "Card"
    )
    await user.click(
      screen.getByRole("button", { name: "Clear category filters" })
    )
    expect(storedFilters()).toEqual({ ...filtered, categoriesId: [] })
    await user.click(screen.getByRole("button", { name: "Clear search" }))
    expect(
      screen.queryByRole("textbox", { name: "Find in view" })
    ).not.toBeInTheDocument()
    expect(storedFilters()).toEqual({
      ...filtered,
      partialDescription: "",
      categoriesId: []
    })

    await openFilterProperty(user, "Description")
    await user.type(
      screen.getByRole("textbox", { name: "Search description" }),
      "Checking"
    )
    await waitFor(() =>
      expect(mocks.transactionQueries.at(-1)?.search).toBe("Checking")
    )
    await openFilterProperty(user, "Category")
    await user.click(screen.getByRole("checkbox", { name: /^None$/ }))
    await user.click(screen.getByRole("button", { name: /^Clear filters$/ }))
    expect(storedFilters()).toEqual({
      ...filtered,
      partialDescription: "",
      categoriesId: []
    })
    expect(mocks.transactionQueries.at(-1)).toEqual(
      expect.objectContaining({ search: undefined, categoryIdList: [] })
    )
  })

  it.each([true, false])(
    "restores separate review months before querying purchases and bills (inline %s)",
    async (inline) => {
      const filters = {
        startDate: "2025-12-01",
        endDate: "2026-02-28",
        reviewMonths: ["2025-12", "2026-02"],
        partialDescription: "",
        categoriesId: []
      }
      seedFilters(filters)
      localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')
      localStorage.setItem(
        "inlineCreditCardTransactions",
        JSON.stringify(inline)
      )
      render(
        <MemoryRouter>
          <Transactions />
        </MemoryRouter>
      )
      await screen.findByTestId(inline ? "transactions-list" : "grouped-ledger")
      expectInitialQuery(filters)
      for (const query of mocks.transactionQueries) {
        expect(query.reviewMonths).toEqual(filters.reviewMonths)
      }
      if (!inline) {
        expect(mocks.billQueries.length).toBeGreaterThan(0)
        for (const query of mocks.billQueries) {
          expect(query.reviewMonths).toEqual(filters.reviewMonths)
        }
      }
      expect(
        screen.getByRole("button", { name: "Review months" })
      ).toHaveTextContent("2 months")
      fireEvent.click(screen.getByRole("button", { name: "Monthly review" }))
      expect(storedFilters()).toEqual(filters)
      fireEvent.click(screen.getByRole("button", { name: "Cash flow" }))
      expect(mocks.transactionQueries.at(-1)?.reviewMonths).toBeUndefined()
      fireEvent.click(screen.getByRole("button", { name: "Monthly review" }))
      expect(mocks.transactionQueries.at(-1)?.reviewMonths).toEqual(
        filters.reviewMonths
      )
      expect(storedFilters()).toEqual(filters)
    }
  )

  it("queries complete review months immediately when restoring partial cash-flow dates", () => {
    seedFilters({
      ...marchFilters,
      startDate: "2026-02-10",
      endDate: "2026-03-20"
    })
    localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')
    localStorage.setItem("inlineCreditCardTransactions", "false")
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    expectInitialQuery({
      ...marchFilters,
      startDate: "2026-02-01",
      endDate: "2026-03-31"
    })
    expect(mocks.billQueries.length).toBeGreaterThan(0)
    for (const query of mocks.billQueries) {
      expect(localDate(query.startDate!)).toBe("2026-02-01")
      expect(localDate(query.endDate!)).toBe("2026-03-31")
    }
    expect(
      screen.getByRole("button", { name: "Review months" })
    ).toHaveTextContent("2 months")
  })

  it("preserves all months when entering monthly review from a cash-flow range", () => {
    seedFilters({
      ...marchFilters,
      startDate: "2026-01-15",
      endDate: "2026-03-20"
    })
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole("button", { name: "Monthly review" }))
    expect(storedFilters()).toEqual({
      ...marchFilters,
      startDate: "2026-01-01",
      endDate: "2026-03-31"
    })
    expect(
      screen.getByRole("button", { name: "Review months" })
    ).toHaveTextContent("3 months")
  })

  it("isolates saved filters and the first query across workspace and signed-in user changes", () => {
    const firstGroup = {
      ...marchFilters,
      partialDescription: "Card",
      categoriesId: ["20"]
    }
    const secondGroup = {
      startDate: "2025-01-01",
      endDate: "2025-01-31",
      partialDescription: "Other group",
      categoriesId: ["-1"]
    }
    const secondUser = {
      startDate: "2025-09-01",
      endDate: "2025-09-30",
      partialDescription: "Other user",
      categoriesId: ["22"]
    }
    seedFilters(firstGroup)
    seedFilters(secondGroup, "fixture-user", "group-2")
    seedFilters(secondUser, "other-user", "group-2")
    localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')
    const page = () => (
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    const { rerender } = render(page())
    expectInitialQuery(firstGroup)

    mocks.groupId = "group-2"
    mocks.transactionQueries.length = 0
    rerender(page())
    expectInitialQuery(secondGroup, "group-2")
    expect(screen.getByRole("textbox", { name: "Find in view" })).toHaveValue(
      "Other group"
    )

    mocks.userId = "other-user"
    mocks.transactionQueries.length = 0
    rerender(page())
    expectInitialQuery(secondUser, "group-2")
    expect(screen.getByRole("textbox", { name: "Find in view" })).toHaveValue(
      "Other user"
    )

    mocks.groupId = "group-1"
    mocks.transactionQueries.length = 0
    rerender(page())
    const now = new Date()
    const defaultPeriod = {
      startDate: localDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      endDate: localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      partialDescription: "",
      categoriesId: []
    }
    expectInitialQuery(defaultPeriod)
    expect(
      screen.queryByRole("textbox", { name: "Find in view" })
    ).not.toBeInTheDocument()
    expect(storedFilters("fixture-user", "group-1")).toEqual(firstGroup)
    expect(storedFilters("fixture-user", "group-2")).toEqual(secondGroup)
    expect(storedFilters("other-user", "group-2")).toEqual(secondUser)
  })

  it.each(["user", "group"])(
    "does not mount or query the ledger before its %s is available",
    (missing) => {
      const filters = {
        ...marchFilters,
        partialDescription: "Restored",
        categoriesId: ["-1"]
      }
      seedFilters(filters)
      if (missing === "user") mocks.userId = null
      else mocks.groupId = null
      const page = () => (
        <MemoryRouter>
          <Transactions />
        </MemoryRouter>
      )
      const { rerender } = render(page())
      expect(screen.getByRole("status")).toHaveTextContent(
        "Loading the ledger..."
      )
      expect(mocks.transactionQueries).toHaveLength(0)
      expect(screen.queryByTestId("grouped-ledger")).not.toBeInTheDocument()

      mocks.userId = "fixture-user"
      mocks.groupId = "group-1"
      rerender(page())
      expectInitialQuery(filters)
    }
  )

  it("keeps date, description, and category filtering usable when scoped storage is unavailable", async () => {
    const user = userEvent.setup()
    const getItem = Storage.prototype.getItem
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (
      this: Storage,
      key
    ) {
      if (key.startsWith("transactionFilters:v1:"))
        throw new Error("Storage blocked")
      return getItem.call(this, key)
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key,
      value
    ) {
      if (key.startsWith("transactionFilters:v1:"))
        throw new Error("Storage blocked")
      setItem.call(this, key, value)
    })
    localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    await selectReviewMonth("February 2026")
    await openFilterProperty(user, "Description")
    await user.type(
      screen.getByRole("textbox", { name: "Search description" }),
      "Card"
    )
    await waitFor(() =>
      expect(mocks.transactionQueries.at(-1)?.search).toBe("Card")
    )
    await openFilterProperty(user, "Category")
    await user.click(screen.getByRole("checkbox", { name: /^None$/ }))
    const query = mocks.transactionQueries.at(-1)!
    expect(query).toEqual(
      expect.objectContaining({ search: "Card", categoryIdList: ["-1"] })
    )
    expect(localDate(query.startDate)).toBe("2026-02-01")
    expect(localDate(query.endDate)).toBe("2026-02-28")
    await user.click(screen.getByRole("button", { name: /^Clear filters$/ }))
    expect(mocks.transactionQueries.at(-1)).toEqual(
      expect.objectContaining({ search: undefined, categoryIdList: [] })
    )
  })

  it("renders checking and credit-card purchases in one inline ledger", async () => {
    localStorage.setItem("inlineCreditCardTransactions", "true")
    localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')

    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )

    const ledgers = await screen.findAllByTestId("transactions-list")
    expect(ledgers).toHaveLength(1)
    expect(within(ledgers[0]).getByText("Checking purchase")).toBeVisible()
    expect(within(ledgers[0]).getByText("Card purchase")).toBeVisible()
    expect(screen.queryByText("Main card bill")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Filter" })).toBeVisible()
    expect(
      screen.queryByRole("dialog", { name: "Transaction filters" })
    ).not.toBeInTheDocument()
    expect(screen.getByText("Category breakdown")).toBeInTheDocument()
    expect(screen.queryByText("Checking transactions")).not.toBeInTheDocument()
    expect(
      screen.queryByText("Credit card transactions")
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Spending month")).not.toBeInTheDocument()
    expect(screen.getByTestId("visible-entry-count")).toHaveTextContent("2")
  })

  it("renders checking entries and the attributed bill in one grouped ledger", () => {
    localStorage.setItem("inlineCreditCardTransactions", "false")

    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )

    const ledgers = screen.getAllByTestId("grouped-ledger")
    expect(ledgers).toHaveLength(1)
    expect(within(ledgers[0]).getByText("Checking purchase")).toBeVisible()
    expect(within(ledgers[0]).getByText("Main card bill")).toBeVisible()
    expect(
      within(ledgers[0]).queryByText("Card purchase")
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Filter" })).toBeVisible()
    expect(
      screen.queryByRole("dialog", { name: "Transaction filters" })
    ).not.toBeInTheDocument()
    expect(screen.getByText("Purchase categories")).toBeInTheDocument()
    expect(screen.queryByText("Checking transactions")).not.toBeInTheDocument()
    expect(screen.queryByText("Credit card bills")).not.toBeInTheDocument()
    expect(screen.getByTestId("visible-entry-count")).toHaveTextContent("2")
  })

  it("keeps transaction filters active while bills are grouped", () => {
    localStorage.setItem("inlineCreditCardTransactions", "false")
    seedFilters({
      ...marchFilters,
      partialDescription: "Card",
      categoriesId: ["20"]
    })

    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )

    const transactionQuery = mocks.transactionQueries.at(-1)
    expect(transactionQuery).toEqual(
      expect.objectContaining({
        search: "Card",
        categoryIdList: ["20"]
      })
    )
    expect(transactionQuery).not.toHaveProperty("accountType")
    expect(screen.getByText("Main card bill")).toBeVisible()
  })

  it("restores expanded filters before transaction and grouped bill queries", () => {
    const filters = {
      ...marchFilters,
      categoriesId: ["20"],
      partialDescription: "Card",
      accountsId: ["11", "12"],
      importSource: "imported" as const,
      importsId: ["31"],
      minValue: -100,
      maxValue: 0
    }
    seedFilters(filters)
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    const expected = {
      accountIdList: ["11", "12"],
      categoryIdList: ["20"],
      search: "Card",
      importSource: "imported",
      importIdList: ["31"],
      minValue: -100,
      maxValue: 0
    }
    expect(mocks.transactionQueries[0]).toEqual(
      expect.objectContaining({ ...expected, enabled: true })
    )
    expect(mocks.billQueries[0]).toEqual(expect.objectContaining(expected))
    expect(storedFilters()).toEqual(filters)
  })

  it("keeps server-matched bills even when their matching purchase is beyond the transaction page", () => {
    mocks.omitCardPurchases = true
    seedFilters({ ...marchFilters, categoriesId: ["20"], minValue: -100 })
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    expect(screen.getByText("Main card bill")).toBeVisible()
    expect(mocks.billQueries.at(-1)).toEqual(
      expect.objectContaining({ categoryIdList: ["20"], minValue: -100 })
    )
  })

  it("intersects selected accounts with an account link instead of broadening it", () => {
    seedFilters({ ...marchFilters, accountsId: ["11", "12"] })
    render(
      <MemoryRouter initialEntries={["/transactions?accountId=12"]}>
        <Transactions />
      </MemoryRouter>
    )
    expect(mocks.transactionQueries[0]).toEqual(
      expect.objectContaining({ accountIdList: ["12"], enabled: true })
    )
    expect(mocks.billQueries[0].accountIdList).toEqual(["12"])
    expect(storedFilters().accountsId).toEqual(["11", "12"])
  })

  it.each(["cash-flow", "monthly-review"])(
    "shows an empty %s ledger when selected accounts exclude the account link",
    async (basis) => {
      seedFilters({ ...marchFilters, accountsId: ["11"] })
      localStorage.setItem("ledgerDateBasis:v1", JSON.stringify(basis))
      render(
        <MemoryRouter initialEntries={["/transactions?accountId=12"]}>
          <Transactions />
        </MemoryRouter>
      )
      await screen.findByTestId(
        basis === "monthly-review" ? "transactions-list" : "grouped-ledger"
      )
      expect(mocks.transactionQueries.length).toBeGreaterThan(0)
      for (const query of mocks.transactionQueries) {
        expect(query.enabled).toBe(false)
        expect(query.accountIdList).toEqual(["12"])
      }
      expect(mocks.billQueries).toHaveLength(0)
      expect(screen.getByTestId("visible-entry-count")).toHaveTextContent("0")
      expect(screen.queryByText("Checking purchase")).not.toBeInTheDocument()
      expect(screen.queryByText("Card purchase")).not.toBeInTheDocument()
      expect(screen.queryByText("Main card bill")).not.toBeInTheDocument()
    }
  )

  it("uses the actual paid amount in cash flow even when purchases in the bill change", () => {
    mocks.changedBill = true
    localStorage.setItem("inlineCreditCardTransactions", "true")
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    expect(screen.getByTestId("grouped-ledger")).toBeVisible()
    expect(
      screen.queryByRole("switch", { name: "Inline credit card transactions" })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Period totals" }))
    const summary = screen.getByRole("dialog", { name: "Period totals" })
    expect(within(summary).getByText("Net flow")).toBeVisible()
    expect(within(summary).getByText(/-R\$\s80,00/)).toBeVisible()
    expect(within(summary).queryByText(/-R\$\s140,00/)).not.toBeInTheDocument()
  })

  it("switches the requested date basis and persists the view preference", async () => {
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    expect(screen.getByTestId("grouped-ledger")).toBeVisible()
    expect(mocks.transactionQueries.at(-1)?.dateBasis).toBe("cash-flow")
    fireEvent.click(screen.getByRole("button", { name: "Monthly review" }))
    expect(mocks.transactionQueries.at(-1)?.dateBasis).toBe("monthly-review")
    expect(
      screen.getByRole("button", { name: "Monthly review" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(localStorage.getItem("ledgerDateBasis:v1")).toBe('"monthly-review"')
    fireEvent.click(screen.getByRole("button", { name: "Cash flow" }))
    expect(mocks.transactionQueries.at(-1)?.dateBasis).toBe("cash-flow")
  })

  it.each([true, false])(
    "excludes linked checking payments from another bill month in review mode (inline %s)",
    async (inline) => {
      mocks.includePayment = true
      localStorage.setItem(
        "inlineCreditCardTransactions",
        JSON.stringify(inline)
      )
      localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')
      render(
        <MemoryRouter>
          <Transactions />
        </MemoryRouter>
      )
      await screen.findByTestId(inline ? "transactions-list" : "grouped-ledger")
      expect(screen.queryByText("Linked payment")).not.toBeInTheDocument()
      expect(screen.getByTestId("visible-entry-count")).toHaveTextContent("2")
      fireEvent.click(screen.getByRole("button", { name: "Period totals" }))
      const summary = screen.getByRole("dialog", { name: "Period totals" })
      expect(within(summary).getByText("Review balance")).toBeVisible()
      expect(within(summary).getByText(/-R\$\s80,00/)).toBeVisible()
    }
  )

  it("keeps ordering and the monthly inline preference together in Display", async () => {
    const user = userEvent.setup()
    localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')
    localStorage.setItem("inlineCreditCardTransactions", "true")
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    await screen.findByTestId("transactions-list")
    expect(
      screen.queryByRole("switch", { name: "Inline credit card transactions" })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Display options" }))
    const display = await screen.findByRole("dialog", {
      name: "Display options"
    })
    expect(
      within(display).getByRole("combobox", { name: "Ordering" })
    ).toHaveTextContent("Date")
    await user.click(
      within(display).getByRole("button", { name: "Sort ascending" })
    )
    expect(
      within(display).getByRole("button", { name: "Sort descending" })
    ).toBeVisible()
    expect(screen.getByTestId("ledger-display-properties")).toHaveAttribute(
      "data-sort",
      "date-asc"
    )
    await user.click(
      within(display).getByRole("switch", {
        name: "Inline credit card transactions"
      })
    )
    expect(localStorage.getItem("inlineCreditCardTransactions")).toBe("false")
    expect(screen.getByTestId("grouped-ledger")).toBeVisible()
    expect(screen.getByText("Main card bill")).toBeVisible()
    expect(display).toBeVisible()
  })

  it("persists property visibility and sorting across reloads and ledger views", async () => {
    const user = userEvent.setup()
    localStorage.setItem("ledgerDateBasis:v1", '"monthly-review"')
    const { unmount } = render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    await screen.findByTestId("transactions-list")
    await user.click(screen.getByRole("button", { name: "Display options" }))
    const display = screen.getByRole("dialog", { name: "Display options" })
    for (const [name, pressed] of [
      ["Account", "true"],
      ["Card number", "true"],
      ["Category", "false"]
    ]) {
      await user.click(within(display).getByRole("button", { name }))
      expect(within(display).getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        pressed
      )
      expect(display).toBeVisible()
    }
    await user.click(
      within(display).getByRole("combobox", { name: "Ordering" })
    )
    await user.click(await screen.findByRole("option", { name: "Amount" }))
    expect(display).toBeVisible()
    await user.click(
      within(display).getByRole("button", { name: "Sort ascending" })
    )
    const preference = {
      ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
      accountName: true,
      category: false,
      cardNumber: true
    }
    expect(
      JSON.parse(localStorage.getItem("transactionDisplay:v1") || "null")
    ).toEqual(preference)
    expect(
      JSON.parse(localStorage.getItem("transactionSort:v1") || "null")
    ).toBe("value-asc")
    expect(
      JSON.parse(
        screen.getByTestId("ledger-display-properties").textContent || "null"
      )
    ).toEqual(preference)
    await user.keyboard("{Escape}")
    unmount()

    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    await screen.findByTestId("transactions-list")
    expect(screen.getByTestId("ledger-display-properties")).toHaveAttribute(
      "data-sort",
      "value-asc"
    )
    expect(
      JSON.parse(
        screen.getByTestId("ledger-display-properties").textContent || "null"
      )
    ).toEqual(preference)
    await user.click(screen.getByRole("button", { name: "Cash flow" }))
    expect(screen.getByTestId("grouped-ledger")).toBeVisible()
    expect(
      JSON.parse(
        screen.getByTestId("ledger-display-properties").textContent || "null"
      )
    ).toEqual(preference)
    expect(screen.getByTestId("ledger-display-properties")).toHaveAttribute(
      "data-sort",
      "value-asc"
    )
  })

  it("restores invalid stored settings and drops unknown fields before persisting", async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      "transactionDisplay:v1",
      JSON.stringify({
        date: false,
        account: "false",
        category: null,
        value: 0,
        unknown: "discard this field"
      })
    )
    localStorage.setItem("transactionSort:v1", '"unsupported-sort"')
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    const preference = {
      ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
      date: false
    }
    expect(
      JSON.parse(
        screen.getByTestId("ledger-display-properties").textContent || "null"
      )
    ).toEqual(preference)
    expect(screen.getByTestId("ledger-display-properties")).toHaveAttribute(
      "data-sort",
      "date-desc"
    )
    await user.click(screen.getByRole("button", { name: "Display options" }))
    await user.click(
      within(screen.getByRole("dialog", { name: "Display options" })).getByRole(
        "button",
        { name: "Date" }
      )
    )
    expect(
      JSON.parse(localStorage.getItem("transactionDisplay:v1") || "null")
    ).toEqual(DEFAULT_TRANSACTION_DISPLAY_PROPERTIES)
  })

  it("opens Filter, Display, find-in-view, and shortcut help from the keyboard", async () => {
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    )
    // The closed totals drawer remains mounted and must not suppress shortcuts.
    fireEvent.keyDown(document.body, { key: "f" })
    expect(
      await screen.findByRole("dialog", { name: "Transaction filters" })
    ).toBeVisible()
    fireEvent.keyDown(document.body, { key: "Escape" })
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Transaction filters" })
      ).not.toBeInTheDocument()
    )

    fireEvent.keyDown(document.body, { key: "V", shiftKey: true })
    const display = await screen.findByRole("dialog", {
      name: "Display options"
    })
    expect(display).toBeVisible()
    fireEvent.keyDown(display, { key: "f" })
    fireEvent.keyDown(display, { key: "?", shiftKey: true })
    expect(
      screen.queryByRole("dialog", { name: "Transaction filters" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("dialog", { name: "Keyboard shortcuts" })
    ).not.toBeInTheDocument()
    fireEvent.keyDown(display, { key: "Escape" })
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Display options" })
      ).not.toBeInTheDocument()
    )

    fireEvent.keyDown(document.body, { key: "f", ctrlKey: true })
    const search = screen.getByRole("textbox", { name: "Find in view" })
    expect(search).toHaveFocus()
    fireEvent.keyDown(search, { key: "Escape" })
    expect(
      screen.queryByRole("textbox", { name: "Find in view" })
    ).not.toBeInTheDocument()

    fireEvent.keyDown(document.body, { key: "?", shiftKey: true })
    const help = await screen.findByRole("dialog", {
      name: "Keyboard shortcuts"
    })
    expect(within(help).getByText("Create an entry")).toBeVisible()
    expect(within(help).getByText("Move through entries")).toBeVisible()
  })

  it("keeps toolbar shortcuts inactive while typing or while totals are open", () => {
    render(
      <MemoryRouter>
        <Transactions />
        <input aria-label="Unrelated input" />
        <div data-testid="empty-editable" />
        <div contentEditable="plaintext-only" data-testid="plain-editable" />
        <div role="textbox" aria-label="Rich description" tabIndex={0} />
      </MemoryRouter>
    )
    screen.getByTestId("empty-editable").setAttribute("contenteditable", "")
    for (const target of [
      screen.getByRole("textbox", { name: "Unrelated input" }),
      screen.getByTestId("empty-editable"),
      screen.getByTestId("plain-editable"),
      screen.getByRole("textbox", { name: "Rich description" })
    ]) {
      for (const event of [
        { key: "f" },
        { key: "V", shiftKey: true },
        { key: "f", ctrlKey: true },
        { key: "?", shiftKey: true }
      ]) {
        fireEvent.keyDown(target, event)
      }
    }
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("textbox", { name: "Find in view" })
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Period totals" }))
    const summary = screen.getByRole("dialog", { name: "Period totals" })
    for (const event of [
      { key: "f" },
      { key: "V", shiftKey: true },
      { key: "f", metaKey: true },
      { key: "?", shiftKey: true }
    ]) {
      fireEvent.keyDown(summary, event)
    }
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("textbox", { name: "Find in view" })
    ).not.toBeInTheDocument()
  })
})
