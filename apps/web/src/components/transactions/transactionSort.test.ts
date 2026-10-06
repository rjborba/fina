import { describe, expect, it } from "vitest"

import type { TransactionOutput as Transaction } from "@fina/types"
import { sortTransactions } from "./transactionSort"

const transaction = (
  id: string,
  overrides: Partial<Transaction>
): Transaction =>
  ({
    id,
    description: id,
    calculatedDate: "2026-01-01",
    value: 0,
    ...overrides
  }) as Transaction

const transactions = [
  transaction("middle", {
    description: "Mercado",
    calculatedDate: "2026-02-10",
    value: 20,
    category: { id: "2", name: "Food", icon: "utensils", color: "violet" }
  }),
  transaction("newest", {
    description: "Aluguel",
    calculatedDate: "2026-03-10",
    value: -100,
    category: { id: "1", name: "Home", icon: "house", color: "lime" }
  }),
  transaction("oldest", {
    description: "Zebra",
    calculatedDate: "2026-01-10",
    value: 50,
    category: null
  })
]

describe("sortTransactions", () => {
  it("sorts dates and values in either direction without mutating input", () => {
    expect(
      sortTransactions(transactions, "date-desc").map(({ id }) => id)
    ).toEqual(["newest", "middle", "oldest"])
    expect(
      sortTransactions(transactions, "value-asc").map(({ id }) => id)
    ).toEqual(["newest", "middle", "oldest"])
    expect(transactions.map(({ id }) => id)).toEqual([
      "middle",
      "newest",
      "oldest"
    ])
  })

  it("sorts descriptions and categories alphabetically", () => {
    expect(
      sortTransactions(transactions, "description-asc").map(({ id }) => id)
    ).toEqual(["newest", "middle", "oldest"])
    expect(
      sortTransactions(transactions, "category-desc").map(({ id }) => id)
    ).toEqual(["newest", "middle", "oldest"])
  })
})
