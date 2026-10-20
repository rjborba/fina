// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createStore, Provider } from "jotai"
import { useState } from "react"
import type { CardMetadata } from "@fina/types"
import { cardMetadataKey } from "@fina/types"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import {
  TransactionFilterPanel,
  TransactionFilterChips,
  TransactionsFilter,
  type TransactionFilterValue
} from "./TransactionsFilter"

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({ selectedGroup: { id: "1" } })
}))

vi.mock("@/data/categories/useCategories", () => ({
  useCategories: () => ({
    isLoading: false,
    data: [
      {
        id: "20",
        name: "Groceries",
        icon: "shopping-cart",
        color: "lime"
      },
      { id: "21", name: "Transport", icon: "car", color: "sky" }
    ]
  })
}))

const closePanel = () => undefined
const cardFixtures = vi.hoisted(() => ({ data: [] as CardMetadata[] }))

vi.mock("@/data/transactions/useTransactionCardValues", () => ({
  useTransactionCardValues: () => ({
    data: cardFixtures.data,
    isLoading: false,
    isError: false
  })
}))

class TestPointerEvent extends MouseEvent {
  readonly pointerType: string
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerType = init.pointerType ?? "mouse"
  }
}

vi.mock("@/data/bankAccounts/useBankAccounts", () => ({
  useBankAccounts: () => ({
    isLoading: false,
    data: [
      {
        id: "30",
        name: "Main account",
        type: "checkout",
        institutionId: "inter"
      },
      { id: "31", name: "Savings", type: "checkout", institutionId: null }
    ]
  })
}))
vi.mock("@/data/imports/useImports", () => ({
  useImports: () => ({
    isLoading: false,
    data: [
      {
        id: "40",
        fileName: "statement.csv",
        accountName: "Main account",
        accountInstitutionId: "inter",
        createdAt: "2026-07-01T00:00:00Z"
      }
    ]
  })
}))

const filterTrigger = () =>
  screen.getByRole("button", { name: /^Filter(?: \d+)?$/ })
const chooseProperty = (name: string) => {
  fireEvent.click(screen.getByRole("button", { name }))
}
const closePopover = () => {
  const submenu = screen.queryByRole("dialog", {
    name: /^(Category|Bank account|Card|Import source|Amount|Date range|Description) filter$/
  })
  if (submenu) fireEvent.keyDown(submenu, { key: "Escape" })
  fireEvent.keyDown(
    screen.getByRole("dialog", { name: "Transaction filters" }),
    { key: "Escape" }
  )
}

function LocalFilters({
  initial = { partialDescription: "", categoriesId: [] }
}: {
  initial?: TransactionFilterValue
}) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <TransactionFilterPanel
        value={value}
        onChange={setValue}
        isOpen
        onFilterToggle={closePanel}
      />
      <output data-testid="local-filter-value">{JSON.stringify(value)}</output>
      <button
        type="button"
        onClick={() => setValue({ partialDescription: "", categoriesId: [] })}
      >
        Reset from page
      </button>
    </>
  )
}

const readLocalFilter = (): TransactionFilterValue =>
  JSON.parse(screen.getByTestId("local-filter-value").textContent || "{}")

function PopoverFilters() {
  const [open, setOpen] = useState(false)
  return (
    <TransactionsFilter
      presentation="popover"
      isOpen={open}
      onFilterToggle={setOpen}
    />
  )
}

function LocalChips() {
  const [value, setValue] = useState<TransactionFilterValue>({
    partialDescription: "Coffee",
    categoriesId: ["20"],
    accountsId: ["30"],
    importSource: "imported",
    minValue: -100,
    maxValue: -50
  })
  return (
    <>
      <TransactionFilterChips value={value} onChange={setValue} />
      <output data-testid="local-filter-value">{JSON.stringify(value)}</output>
    </>
  )
}

describe("reusable transaction filters", () => {
  beforeEach(() => {
    cardFixtures.data = []
    vi.useFakeTimers()
    vi.stubGlobal("PointerEvent", TestPointerEvent)
  })

  it("combines named and unidentified card values without requiring saved card identities or altering other filters", () => {
    cardFixtures.data = [
      { cardName: "Main physical", cardLast4: "0042" },
      { cardName: "Old virtual", cardLast4: null }
    ]
    render(
      <LocalFilters
        initial={{
          partialDescription: "Coffee",
          categoriesId: ["20"],
          accountsId: ["30"]
        }}
      />
    )
    const cards = within(screen.getByRole("region", { name: "Card filter" }))
    fireEvent.click(
      cards.getByRole("checkbox", {
        name: "Main physical · ••0042"
      })
    )
    fireEvent.click(cards.getByRole("checkbox", { name: "Not identified" }))
    expect(readLocalFilter()).toEqual({
      partialDescription: "Coffee",
      categoriesId: ["20"],
      accountsId: ["30"],
      cards: [cardMetadataKey(cardFixtures.data[0]), "-1"]
    })
    fireEvent.change(cards.getByRole("textbox", { name: "Search cards" }), {
      target: { value: "Old virtual" }
    })
    expect(
      cards.queryByRole("checkbox", { name: "Not identified" })
    ).not.toBeInTheDocument()
    fireEvent.click(
      cards.getByRole("checkbox", {
        name: "Old virtual"
      })
    )
    expect(readLocalFilter().cards).toEqual([
      cardMetadataKey(cardFixtures.data[0]),
      "-1",
      cardMetadataKey(cardFixtures.data[1])
    ])
    fireEvent.change(cards.getByRole("textbox", { name: "Search cards" }), {
      target: { value: "" }
    })
    expect(
      cards.getByRole("checkbox", { name: "Not identified" })
    ).toBeChecked()
    fireEvent.click(
      cards.getByRole("checkbox", {
        name: "Main physical · ••0042"
      })
    )
    expect(readLocalFilter().cards).toEqual([
      "-1",
      cardMetadataKey(cardFixtures.data[1])
    ])
  })
  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("debounces search without overwriting category choices made while typing", () => {
    render(<LocalFilters />)

    fireEvent.change(screen.getByLabelText("Search description"), {
      target: { value: "Coffee" }
    })
    act(() => vi.advanceTimersByTime(199))
    expect(readLocalFilter().partialDescription).toBe("")

    fireEvent.click(screen.getByRole("checkbox", { name: "Groceries" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "None" }))
    act(() => vi.advanceTimersByTime(1))
    expect(readLocalFilter()).toEqual({
      partialDescription: "Coffee",
      categoriesId: ["20", "-1"]
    })

    fireEvent.click(screen.getByRole("checkbox", { name: "Groceries" }))
    expect(readLocalFilter()).toEqual({
      partialDescription: "Coffee",
      categoriesId: ["-1"]
    })

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByLabelText("Search description")).toHaveValue("")
    expect(readLocalFilter()).toEqual({
      partialDescription: "",
      categoriesId: []
    })
  })

  it("updates the search input on external clear and cancels a pending search", () => {
    render(
      <LocalFilters
        initial={{ partialDescription: "Coffee", categoriesId: ["20"] }}
      />
    )
    fireEvent.change(screen.getByLabelText("Search description"), {
      target: { value: "Coffee draft" }
    })
    fireEvent.click(screen.getByRole("button", { name: "Reset from page" }))
    act(() => vi.advanceTimersByTime(200))

    expect(screen.getByLabelText("Search description")).toHaveValue("")
    expect(readLocalFilter()).toEqual({
      partialDescription: "",
      categoriesId: []
    })
  })

  it("keeps bill-local filters independent from the Transactions atom and preserves dates", () => {
    const store = createStore()
    const ledgerFilter = {
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 6, 31),
      partialDescription: "Ledger",
      categoriesId: ["21"]
    }
    store.set(transactionFilterAtom, ledgerFilter)
    render(
      <Provider store={store}>
        <section aria-label="Bill filter area">
          <LocalFilters />
        </section>
        <section aria-label="Ledger filter area">
          <TransactionsFilter isOpen onFilterToggle={closePanel} />
        </section>
      </Provider>
    )
    const billArea = within(
      screen.getByRole("region", { name: "Bill filter area" })
    )
    const ledgerArea = within(
      screen.getByRole("region", { name: "Ledger filter area" })
    )
    expect(billArea.getByLabelText("Search description")).toHaveValue("")
    expect(ledgerArea.getByLabelText("Search description")).toHaveValue(
      "Ledger"
    )

    fireEvent.change(billArea.getByLabelText("Search description"), {
      target: { value: "Card" }
    })
    fireEvent.click(billArea.getByRole("checkbox", { name: "Groceries" }))
    act(() => vi.advanceTimersByTime(200))
    expect(store.get(transactionFilterAtom)).toEqual(ledgerFilter)
    expect(readLocalFilter()).toEqual({
      partialDescription: "Card",
      categoriesId: ["20"]
    })

    fireEvent.click(ledgerArea.getByRole("button", { name: "Clear filters" }))
    act(() => vi.advanceTimersByTime(200))
    expect(store.get(transactionFilterAtom)).toEqual({
      ...ledgerFilter,
      partialDescription: "",
      categoriesId: []
    })
    expect(readLocalFilter()).toEqual({
      partialDescription: "Card",
      categoriesId: ["20"]
    })
  })

  it("closes on Escape and makes closed filter controls inaccessible", () => {
    const onFilterToggle = vi.fn()
    const panel = (
      <TransactionFilterPanel
        value={{ partialDescription: "", categoriesId: [] }}
        onChange={vi.fn()}
        isOpen
        onFilterToggle={onFilterToggle}
      />
    )
    const { rerender } = render(panel)
    const element = screen.getByRole("complementary", {
      name: "Transaction filters"
    })
    expect(element).not.toHaveAttribute("inert")
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onFilterToggle).toHaveBeenCalledWith(false)

    rerender({ ...panel, props: { ...panel.props, isOpen: false } })
    expect(element).toHaveAttribute("inert")
    expect(
      screen.queryByRole("complementary", { name: "Transaction filters" })
    ).not.toBeInTheDocument()
  })

  it("opens category filters beside the trigger and preserves selection when dismissed", () => {
    const store = createStore()
    const ledgerFilter = {
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 6, 31),
      partialDescription: "Coffee",
      categoriesId: [] as string[]
    }
    store.set(transactionFilterAtom, ledgerFilter)
    render(
      <Provider store={store}>
        <PopoverFilters />
      </Provider>
    )
    expect(
      screen.queryByRole("dialog", { name: "Transaction filters" })
    ).not.toBeInTheDocument()
    fireEvent.click(filterTrigger())
    chooseProperty("Category")
    const popover = screen.getByRole("dialog", {
      name: "Category filter"
    })
    fireEvent.click(
      within(popover).getByRole("checkbox", { name: "Groceries" })
    )
    fireEvent.click(within(popover).getByRole("checkbox", { name: "None" }))
    expect(store.get(transactionFilterAtom)).toEqual({
      ...ledgerFilter,
      categoriesId: ["20", "-1"]
    })
    closePopover()
    expect(
      screen.queryByRole("dialog", { name: "Transaction filters" })
    ).not.toBeInTheDocument()
    fireEvent.click(filterTrigger())
    chooseProperty("Category")
    expect(screen.getByRole("checkbox", { name: "Groceries" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "None" })).toBeChecked()
    chooseProperty("Description")
    expect(screen.getByLabelText("Search description")).toHaveValue("Coffee")
  })

  it("closes the submenu before the property menu on Escape", () => {
    render(<PopoverFilters />)
    fireEvent.click(filterTrigger())
    chooseProperty("Category")
    const category = screen.getByRole("button", { name: "Category" })
    expect(category).toHaveAttribute("aria-expanded", "true")
    expect(category).toHaveAttribute("aria-haspopup", "dialog")

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Category filter" }), {
      key: "Escape"
    })
    act(() => vi.advanceTimersByTime(0))
    expect(
      screen.queryByRole("dialog", { name: "Category filter" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("dialog", { name: "Transaction filters" })
    ).toBeInTheDocument()
    expect(category).toHaveAttribute("aria-expanded", "false")
    expect(category).toHaveFocus()

    fireEvent.keyDown(category, { key: "Escape" })
    expect(
      screen.queryByRole("dialog", { name: "Transaction filters" })
    ).not.toBeInTheDocument()
  })

  it("opens hover submenus without stealing focus and keeps the pointer path to choices open", () => {
    const store = createStore()
    render(
      <Provider store={store}>
        <PopoverFilters />
      </Provider>
    )
    fireEvent.click(filterTrigger())
    const propertySearch = screen.getByLabelText("Search filter properties")
    act(() => propertySearch.focus())
    const category = screen.getByRole("button", { name: "Category" })
    fireEvent.pointerEnter(category, { pointerType: "mouse" })

    const submenu = screen.getByRole("dialog", { name: "Category filter" })
    expect(propertySearch).toHaveFocus()
    expect(
      screen.getByRole("dialog", { name: "Transaction filters" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Bank account" })).toBeVisible()
    expect(category).toHaveAttribute("aria-expanded", "true")
    fireEvent.pointerLeave(category, {
      pointerType: "mouse",
      relatedTarget: submenu
    })
    fireEvent.pointerEnter(submenu, { pointerType: "mouse" })
    act(() => vi.advanceTimersByTime(300))
    fireEvent.click(
      within(submenu).getByRole("checkbox", { name: "Groceries" })
    )
    expect(store.get(transactionFilterAtom).categoriesId).toEqual(["20"])

    fireEvent.pointerEnter(
      screen.getByRole("button", { name: "Bank account" }),
      {
        pointerType: "mouse"
      }
    )
    expect(
      screen.queryByRole("dialog", { name: "Category filter" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("dialog", { name: "Bank account filter" })
    ).toBeVisible()
    expect(screen.getByLabelText("Search filter properties")).toBeVisible()
    expect(category).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(screen.getByRole("checkbox", { name: "Main account" }))
    expect(store.get(transactionFilterAtom)).toMatchObject({
      categoriesId: ["20"],
      accountsId: ["30"]
    })
    fireEvent.pointerLeave(
      screen.getByRole("dialog", { name: "Bank account filter" }),
      { pointerType: "mouse", relatedTarget: document.body }
    )
    act(() => vi.advanceTimersByTime(249))
    expect(
      screen.getByRole("dialog", { name: "Bank account filter" })
    ).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(
      screen.queryByRole("dialog", { name: "Bank account filter" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("dialog", { name: "Transaction filters" })
    ).toBeInTheDocument()
  })

  it("supports click-open selection for touch pointers without relying on hover", () => {
    vi.stubGlobal("innerWidth", 390)
    const store = createStore()
    render(
      <Provider store={store}>
        <PopoverFilters />
      </Provider>
    )
    fireEvent.click(filterTrigger())
    const account = screen.getByRole("button", { name: "Bank account" })
    fireEvent.pointerEnter(account, { pointerType: "touch" })
    expect(
      screen.queryByRole("dialog", { name: "Bank account filter" })
    ).not.toBeInTheDocument()
    fireEvent.pointerDown(account, { pointerType: "touch" })
    fireEvent.click(account)
    act(() => vi.advanceTimersByTime(0))
    expect(screen.getByLabelText("Search bank accounts")).toHaveFocus()
    fireEvent.click(screen.getByRole("checkbox", { name: "Savings" }))
    expect(store.get(transactionFilterAtom).accountsId).toEqual(["31"])
    fireEvent.pointerLeave(
      screen.getByRole("dialog", { name: "Bank account filter" }),
      { pointerType: "touch", relatedTarget: document.body }
    )
    act(() => vi.advanceTimersByTime(300))
    expect(
      screen.getByRole("dialog", { name: "Bank account filter" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("dialog", { name: "Transaction filters" })
    ).toBeInTheDocument()
  })

  it("opens and returns from submenus with the keyboard", async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(<PopoverFilters />)
    fireEvent.click(filterTrigger())
    const category = screen.getByRole("button", { name: "Category" })
    act(() => category.focus())
    fireEvent.keyDown(category, { key: "ArrowRight" })
    expect(screen.getByLabelText("Search categories")).toHaveFocus()
    expect(
      screen.getByRole("dialog", { name: "Transaction filters" })
    ).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Search categories"), {
      key: "ArrowLeft"
    })
    expect(screen.getByLabelText("Search categories")).toHaveFocus()
    const groceries = screen.getByRole("checkbox", { name: "Groceries" })
    act(() => groceries.focus())
    fireEvent.keyDown(groceries, { key: "ArrowLeft" })
    expect(category).toHaveFocus()
    expect(
      screen.queryByRole("dialog", { name: "Category filter" })
    ).not.toBeInTheDocument()

    const description = screen.getByRole("button", { name: "Description" })
    act(() => description.focus())
    await user.keyboard("{Enter}")
    expect(screen.getByLabelText("Search description")).toHaveFocus()
  })

  it.each(["Escape", "trigger"])(
    "commits pending description on quick popover dismissal by %s",
    (dismissal) => {
      const store = createStore()
      const ledgerFilter = {
        startDate: new Date(2026, 6, 1),
        endDate: new Date(2026, 6, 31),
        partialDescription: "Coffee",
        categoriesId: ["20"]
      }
      store.set(transactionFilterAtom, ledgerFilter)
      render(
        <Provider store={store}>
          <PopoverFilters />
        </Provider>
      )
      fireEvent.click(filterTrigger())
      chooseProperty("Description")
      fireEvent.change(screen.getByLabelText("Search description"), {
        target: { value: "Coffee shop" }
      })
      act(() => vi.advanceTimersByTime(199))
      expect(store.get(transactionFilterAtom).partialDescription).toBe("Coffee")
      chooseProperty("Category")
      fireEvent.click(screen.getByRole("checkbox", { name: "None" }))
      if (dismissal === "Escape") {
        closePopover()
      } else {
        fireEvent.click(filterTrigger())
      }
      expect(
        screen.queryByRole("dialog", { name: "Transaction filters" })
      ).not.toBeInTheDocument()
      act(() => vi.advanceTimersByTime(200))
      expect(store.get(transactionFilterAtom)).toEqual({
        ...ledgerFilter,
        partialDescription: "Coffee shop",
        categoriesId: ["20", "-1"]
      })
      fireEvent.click(filterTrigger())
      chooseProperty("Description")
      expect(screen.getByLabelText("Search description")).toHaveValue(
        "Coffee shop"
      )
    }
  )

  it("does not restore a pending popover draft after an external clear", () => {
    const store = createStore()
    const ledgerFilter = {
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 6, 31),
      partialDescription: "Coffee",
      categoriesId: ["20"]
    }
    store.set(transactionFilterAtom, ledgerFilter)
    render(
      <Provider store={store}>
        <PopoverFilters />
      </Provider>
    )
    fireEvent.click(filterTrigger())
    chooseProperty("Description")
    fireEvent.change(screen.getByLabelText("Search description"), {
      target: { value: "Coffee draft" }
    })
    const clearedFilter = {
      ...ledgerFilter,
      partialDescription: "",
      categoriesId: []
    }
    act(() => store.set(transactionFilterAtom, clearedFilter))
    closePopover()
    act(() => vi.advanceTimersByTime(200))
    expect(store.get(transactionFilterAtom)).toEqual(clearedFilter)
    fireEvent.click(filterTrigger())
    chooseProperty("Description")
    expect(screen.getByLabelText("Search description")).toHaveValue("")
  })

  it("searches properties and composes multiple accounts with a specific import", () => {
    const store = createStore()
    render(
      <Provider store={store}>
        <PopoverFilters />
      </Provider>
    )
    fireEvent.click(filterTrigger())
    fireEvent.change(screen.getByLabelText("Search filter properties"), {
      target: { value: "bank" }
    })
    expect(
      screen.queryByRole("button", { name: "Category" })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Bank account" }))
    expect(
      screen
        .getByRole("checkbox", { name: "Main account" })
        .closest("label")
        ?.querySelector('[data-institution-id="inter"] img')
    ).not.toBeNull()
    fireEvent.click(screen.getByRole("checkbox", { name: "Main account" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Savings" }))
    fireEvent.change(screen.getByLabelText("Search filter properties"), {
      target: { value: "" }
    })
    chooseProperty("Import source")
    fireEvent.click(screen.getByRole("checkbox", { name: /statement.csv/ }))
    expect(store.get(transactionFilterAtom)).toMatchObject({
      accountsId: ["30", "31"],
      importsId: ["40"],
      importSource: "imported"
    })
    fireEvent.click(screen.getByRole("button", { name: "Manual" }))
    expect(store.get(transactionFilterAtom)).toMatchObject({
      accountsId: ["30", "31"],
      importsId: [],
      importSource: "manual"
    })
    expect(
      screen.queryByRole("checkbox", { name: /statement.csv/ })
    ).not.toBeInTheDocument()
  })

  it("applies signed inclusive ranges and exact zero while keeping invalid drafts local", () => {
    render(<LocalFilters />)
    fireEvent.change(
      screen.getByRole("combobox", { name: "Amount condition" }),
      { target: { value: "between" } }
    )
    fireEvent.change(screen.getByLabelText("Minimum amount"), {
      target: { value: "-50" }
    })
    fireEvent.change(screen.getByLabelText("Maximum amount"), {
      target: { value: "-100" }
    })
    fireEvent.click(screen.getByRole("button", { name: "Apply amount" }))
    expect(screen.getByRole("alert")).toHaveTextContent("minimum cannot exceed")
    expect(readLocalFilter().minValue).toBeUndefined()
    fireEvent.change(screen.getByLabelText("Minimum amount"), {
      target: { value: "-100" }
    })
    fireEvent.change(screen.getByLabelText("Maximum amount"), {
      target: { value: "-50" }
    })
    fireEvent.click(screen.getByRole("button", { name: "Apply amount" }))
    expect(readLocalFilter()).toMatchObject({ minValue: -100, maxValue: -50 })
    fireEvent.change(
      screen.getByRole("combobox", { name: "Amount condition" }),
      { target: { value: "exact" } }
    )
    fireEvent.change(screen.getByLabelText("Amount", { exact: true }), {
      target: { value: "0" }
    })
    fireEvent.click(screen.getByRole("button", { name: "Apply amount" }))
    expect(readLocalFilter()).toMatchObject({ minValue: 0, maxValue: 0 })
  })

  it("validates the date range and preserves it when clearing other filters", () => {
    const store = createStore()
    store.set(transactionFilterAtom, {
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 6, 31),
      partialDescription: "Coffee",
      categoriesId: ["20"],
      accountsId: ["30"],
      importSource: "manual",
      minValue: -100
    })
    render(
      <Provider store={store}>
        <PopoverFilters />
      </Provider>
    )
    fireEvent.click(filterTrigger())
    chooseProperty("Date range")
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-07-20" }
    })
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-07-10" }
    })
    fireEvent.click(screen.getByRole("button", { name: "Apply range" }))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(store.get(transactionFilterAtom).startDate.getDate()).toBe(1)
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-07-25" }
    })
    fireEvent.click(screen.getByRole("button", { name: "Apply range" }))
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(store.get(transactionFilterAtom)).toMatchObject({
      partialDescription: "",
      categoriesId: [],
      accountsId: undefined,
      importSource: undefined,
      minValue: undefined
    })
    expect(store.get(transactionFilterAtom).startDate.getDate()).toBe(20)
    expect(store.get(transactionFilterAtom).endDate.getDate()).toBe(25)
  })

  it("edits and clears a chip without losing other criteria", () => {
    render(<LocalChips />)
    expect(
      screen
        .getByRole("button", { name: "Edit Account is Main account" })
        .querySelector('[data-institution-id="inter"] img')
    ).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /Edit Amount/ }))
    expect(
      screen.queryByRole("button", { name: "Back to filter properties" })
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Minimum amount"), {
      target: { value: "-90" }
    })
    fireEvent.click(screen.getByRole("button", { name: "Apply amount" }))
    fireEvent.keyDown(
      screen.getByRole("dialog", { name: "Edit transaction filter" }),
      { key: "Escape" }
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Clear account filters" })
    )
    expect(readLocalFilter()).toEqual({
      partialDescription: "Coffee",
      categoriesId: ["20"],
      importSource: "imported",
      minValue: -90,
      maxValue: -50
    })
  })

  it("returns to the property picker when reopening retained exit content", () => {
    const props = {
      value: { partialDescription: "", categoriesId: [] },
      onChange: vi.fn(),
      onFilterToggle: vi.fn(),
      compact: true
    }
    const { rerender } = render(<TransactionFilterPanel {...props} isOpen />)
    fireEvent.change(screen.getByLabelText("Search filter properties"), {
      target: { value: "description" }
    })
    fireEvent.click(screen.getByRole("button", { name: "Description" }))
    expect(screen.getByLabelText("Search description")).toBeInTheDocument()
    rerender(<TransactionFilterPanel {...props} isOpen={false} />)
    rerender(<TransactionFilterPanel {...props} isOpen />)
    expect(screen.getByLabelText("Search filter properties")).toHaveValue("")
    expect(screen.getByRole("button", { name: "Category" })).toBeInTheDocument()
    expect(
      screen.queryByLabelText("Search description")
    ).not.toBeInTheDocument()
  })
})
