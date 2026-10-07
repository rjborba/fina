// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { getDefaultStore } from "jotai"
import { afterEach, describe, expect, it } from "vitest"
import dayjs from "dayjs"
import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import { TransactionsDateFilter } from "./TransactionsDateFilter"

afterEach(cleanup)

describe("monthly review calendar", () => {
  it("selects the entire month and keeps text/category filters", () => {
    getDefaultStore().set(transactionFilterAtom, {
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 6, 31),
      partialDescription: "Synthetic",
      categoriesId: ["20"]
    })
    render(<TransactionsDateFilter monthlyReview />)
    fireEvent.change(screen.getByLabelText("Review month"), {
      target: { value: "2026-06" }
    })
    const filter = getDefaultStore().get(transactionFilterAtom)
    expect(dayjs(filter.startDate).format("YYYY-MM-DD")).toBe("2026-06-01")
    expect(dayjs(filter.endDate).format("YYYY-MM-DD")).toBe("2026-06-30")
    expect(filter.partialDescription).toBe("Synthetic")
    expect(filter.categoriesId).toEqual(["20"])
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }))
    expect(screen.getByLabelText("Review month")).toHaveValue("2026-05")
  })
})
