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
import { createStore, Provider } from "jotai"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import {
  TransactionFilterPanel,
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

describe("reusable transaction filters", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
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
})
