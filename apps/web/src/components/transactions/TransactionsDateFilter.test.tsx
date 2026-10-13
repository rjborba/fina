// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getDefaultStore } from "jotai"
import { afterEach, describe, expect, it } from "vitest"
import dayjs from "dayjs"
import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import { TransactionsDateFilter } from "./TransactionsDateFilter"

afterEach(cleanup)

describe("monthly review calendar", () => {
  it("selects separate months and keeps text/category filters", async () => {
    const user = userEvent.setup()
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 6, 31),
      partialDescription: "Synthetic",
      categoriesId: ["20"]
    })
    render(<TransactionsDateFilter monthlyReview />)
    await user.click(screen.getByRole("button", { name: "Review months" }))
    const picker = screen.getByRole("dialog", { name: "Review months" })
    await user.click(within(picker).getByRole("button", { name: "May 2026" }))
    expect(picker).toBeVisible()
    expect(
      within(picker).getByRole("button", { name: "May 2026" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(
      within(picker).getByRole("button", { name: "June 2026" })
    ).toHaveAttribute("aria-pressed", "false")
    const filter = getDefaultStore().get(transactionFilterAtom)
    expect(filter.reviewMonths).toEqual(["2026-05", "2026-07"])
    expect(dayjs(filter.startDate).format("YYYY-MM-DD")).toBe("2026-05-01")
    expect(dayjs(filter.endDate).format("YYYY-MM-DD")).toBe("2026-07-31")
    expect(filter.partialDescription).toBe("Synthetic")
    expect(filter.categoriesId).toEqual(["20"])
    await user.click(within(picker).getByRole("button", { name: "Done" }))
    expect(
      screen.getByRole("button", { name: "Review months" })
    ).toHaveTextContent("2 months")
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }))
    expect(getDefaultStore().get(transactionFilterAtom).reviewMonths).toEqual([
      "2026-04",
      "2026-06"
    ])
  })

  it("keeps selections across years, allows removal, and requires at least one month", async () => {
    const user = userEvent.setup()
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date(2025, 11, 1),
      endDate: new Date(2025, 11, 31),
      partialDescription: "",
      categoriesId: []
    })
    render(<TransactionsDateFilter monthlyReview />)
    await user.click(screen.getByRole("button", { name: "Review months" }))
    const picker = screen.getByRole("dialog", { name: "Review months" })
    expect(
      within(picker).getByRole("button", { name: "December 2025" })
    ).toBeDisabled()
    await user.click(within(picker).getByRole("button", { name: "Next year" }))
    await user.click(
      within(picker).getByRole("button", { name: "February 2026" })
    )
    expect(getDefaultStore().get(transactionFilterAtom).reviewMonths).toEqual([
      "2025-12",
      "2026-02"
    ])
    await user.click(
      within(picker).getByRole("button", { name: "Previous year" })
    )
    await user.click(
      within(picker).getByRole("button", { name: "December 2025" })
    )
    const filter = getDefaultStore().get(transactionFilterAtom)
    expect(filter.reviewMonths).toEqual(["2026-02"])
    expect(dayjs(filter.startDate).format("YYYY-MM-DD")).toBe("2026-02-01")
    expect(dayjs(filter.endDate).format("YYYY-MM-DD")).toBe("2026-02-28")
    await user.keyboard("{Escape}")
    expect(screen.getByRole("button", { name: "Review months" })).toHaveFocus()
    fireEvent.click(screen.getByRole("button", { name: "Next month" }))
    expect(getDefaultStore().get(transactionFilterAtom).reviewMonths).toEqual([
      "2026-03"
    ])
  })

  it("shows all months from a saved legacy range as selected", async () => {
    const user = userEvent.setup()
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 7, 31),
      partialDescription: "",
      categoriesId: []
    })
    render(<TransactionsDateFilter monthlyReview />)
    await user.click(screen.getByRole("button", { name: "Review months" }))
    const picker = screen.getByRole("dialog", { name: "Review months" })
    for (const month of ["June", "July", "August"]) {
      expect(
        within(picker).getByRole("button", { name: `${month} 2026` })
      ).toHaveAttribute("aria-pressed", "true")
    }
    await user.click(within(picker).getByRole("button", { name: "July 2026" }))
    expect(getDefaultStore().get(transactionFilterAtom).reviewMonths).toEqual([
      "2026-06",
      "2026-08"
    ])
  })

  it("keeps long legacy ranges queryable until a valid month selection replaces them", async () => {
    const user = userEvent.setup()
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date(2010, 0, 1),
      endDate: new Date(2020, 0, 31),
      partialDescription: "",
      categoriesId: []
    })
    render(<TransactionsDateFilter monthlyReview />)
    fireEvent.click(screen.getByRole("button", { name: "Next month" }))
    const shifted = getDefaultStore().get(transactionFilterAtom)
    expect(shifted.reviewMonths).toBeUndefined()
    expect(shifted.startDate).toEqual(new Date(2010, 1, 1))
    expect(shifted.endDate).toEqual(new Date(2020, 1, 29, 23, 59, 59, 999))
    await user.click(screen.getByRole("button", { name: "Review months" }))
    const picker = screen.getByRole("dialog", { name: "Review months" })
    expect(
      within(picker).getByRole("button", { name: "February 2010" })
    ).toBeDisabled()
    await user.click(
      within(picker).getByRole("button", { name: "Use current month" })
    )
    expect(getDefaultStore().get(transactionFilterAtom).reviewMonths).toEqual([
      dayjs().format("YYYY-MM")
    ])
  })

  it("keeps early calendar years exact and prevents navigation beyond supported years", async () => {
    const user = userEvent.setup()
    const early = new Date(0)
    early.setFullYear(1, 0, 1)
    early.setHours(0, 0, 0, 0)
    getDefaultStore().set(transactionFilterAtom, {
      startDate: early,
      endDate: early,
      partialDescription: "",
      categoriesId: []
    })
    const { unmount } = render(<TransactionsDateFilter monthlyReview />)
    expect(
      screen.getByRole("button", { name: "Previous month" })
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Review months" })
    ).toHaveTextContent("Jan 0001")
    await user.click(screen.getByRole("button", { name: "Review months" }))
    const picker = screen.getByRole("dialog", { name: "Review months" })
    await user.click(within(picker).getByRole("button", { name: "March 0001" }))
    await user.click(
      within(picker).getByRole("button", { name: "January 0001" })
    )
    const filter = getDefaultStore().get(transactionFilterAtom)
    expect(filter.reviewMonths).toEqual(["0001-03"])
    expect(filter.startDate.getFullYear()).toBe(1)
    expect(filter.startDate.getMonth()).toBe(2)
    expect(filter.endDate.getFullYear()).toBe(1)
    expect(filter.endDate.getDate()).toBe(31)
    unmount()
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date(9999, 11, 1),
      endDate: new Date(9999, 11, 31),
      partialDescription: "",
      categoriesId: []
    })
    render(<TransactionsDateFilter monthlyReview />)
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled()
  })
})

describe("cash flow date range", () => {
  it("keeps a multi-month range visible and shifts both endpoints without collapsing it", () => {
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 6, 31),
      reviewMonths: ["2026-06", "2026-07"],
      partialDescription: "Synthetic",
      categoriesId: ["20"]
    })
    render(<TransactionsDateFilter />)
    const range = screen.getByRole("button", { name: "Date range" })
    expect(range).toHaveTextContent("1 Jun – 31 Jul 2026")

    fireEvent.click(screen.getByRole("button", { name: "Next month" }))
    const filter = getDefaultStore().get(transactionFilterAtom)
    expect(dayjs(filter.startDate).format("YYYY-MM-DD")).toBe("2026-07-01")
    expect(dayjs(filter.endDate).format("YYYY-MM-DD")).toBe("2026-08-31")
    expect(filter.partialDescription).toBe("Synthetic")
    expect(filter.categoriesId).toEqual(["20"])
    expect(filter.reviewMonths).toBeUndefined()
    expect(range).toHaveTextContent("1 Jul – 31 Aug 2026")
  })

  it("shows a single whole month compactly and navigates to the complete adjacent month", () => {
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 5, 30),
      partialDescription: "",
      categoriesId: []
    })
    render(<TransactionsDateFilter />)
    expect(
      screen.getByRole("button", { name: "Date range" })
    ).toHaveTextContent("Jun 2026")
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }))
    const filter = getDefaultStore().get(transactionFilterAtom)
    expect(dayjs(filter.startDate).format("YYYY-MM-DD")).toBe("2026-05-01")
    expect(dayjs(filter.endDate).format("YYYY-MM-DD")).toBe("2026-05-31")
  })
})
