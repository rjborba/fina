// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import { TransactionsSearch } from "./TransactionsSearch"

function Search() {
  const [open, setOpen] = useState(false)
  return <TransactionsSearch open={open} onOpenChange={setOpen} />
}

const initialFilter = {
  startDate: new Date(2026, 6, 1),
  endDate: new Date(2026, 6, 31),
  partialDescription: "",
  categoriesId: ["20"]
}

describe("find in view", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("focuses the search and debounces without overwriting current dates or categories", () => {
    const store = createStore()
    store.set(transactionFilterAtom, initialFilter)
    render(
      <Provider store={store}>
        <Search />
      </Provider>
    )
    fireEvent.click(screen.getByRole("button", { name: "Find in view" }))
    const input = screen.getByRole("textbox", { name: "Find in view" })
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: "Coffee" } })
    act(() => vi.advanceTimersByTime(199))
    expect(store.get(transactionFilterAtom).partialDescription).toBe("")

    const latestFilter = {
      ...initialFilter,
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 5, 30),
      categoriesId: ["21", "-1"]
    }
    act(() => store.set(transactionFilterAtom, latestFilter))
    act(() => vi.advanceTimersByTime(1))
    expect(store.get(transactionFilterAtom)).toEqual({
      ...latestFilter,
      partialDescription: "Coffee"
    })
  })

  it.each(["clear", "Escape"])(
    "cancels pending text and preserves other filters on %s",
    (action) => {
      const store = createStore()
      store.set(transactionFilterAtom, {
        ...initialFilter,
        partialDescription: "Saved search"
      })
      render(
        <Provider store={store}>
          <Search />
        </Provider>
      )
      const input = screen.getByRole("textbox", { name: "Find in view" })
      expect(input).toHaveValue("Saved search")
      fireEvent.change(input, { target: { value: "Pending search" } })
      if (action === "clear") {
        fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
      } else {
        fireEvent.keyDown(input, { key: "Escape" })
      }
      act(() => vi.advanceTimersByTime(200))
      expect(store.get(transactionFilterAtom)).toEqual(initialFilter)
      expect(
        screen.queryByRole("textbox", { name: "Find in view" })
      ).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Find in view" })).toBeVisible()
    }
  )

  it("reflects an external text change and cancels the stale draft", () => {
    const store = createStore()
    store.set(transactionFilterAtom, initialFilter)
    render(
      <Provider store={store}>
        <Search />
      </Provider>
    )
    fireEvent.click(screen.getByRole("button", { name: "Find in view" }))
    const input = screen.getByRole("textbox", { name: "Find in view" })
    fireEvent.change(input, { target: { value: "Pending search" } })
    act(() =>
      store.set(transactionFilterAtom, {
        ...initialFilter,
        partialDescription: "External search"
      })
    )
    act(() => vi.advanceTimersByTime(200))
    expect(input).toHaveValue("External search")
    expect(store.get(transactionFilterAtom).partialDescription).toBe(
      "External search"
    )
  })
})
