import { describe, expect, it } from "vitest"

import type { TransactionOutput as Transaction } from "@fina/types"
import { sortTransactions, type TransactionSortOption } from "./transactionSort"

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

  it.each([
    "date-desc",
    "date-asc",
    "value-desc",
    "value-asc",
    "description-asc",
    "description-desc",
    "category-asc",
    "category-desc"
  ] satisfies TransactionSortOption[])(
    "keeps tied rows in a deterministic order for %s across refreshed responses",
    (sort) => {
      const tiedTransactions = ["c", "a", "b"].map((id) =>
        transaction(id, {
          description: "Purchase",
          calculatedDate: "2026-09-27",
          value: -10,
          category: {
            id: "category-1",
            name: "Food",
            icon: "utensils",
            color: "violet"
          }
        })
      )
      const expectedIds = ["a", "b", "c"]

      for (const response of [
        tiedTransactions,
        [...tiedTransactions].reverse(),
        [...tiedTransactions.slice(1), tiedTransactions[0]]
      ]) {
        expect(sortTransactions(response, sort).map(({ id }) => id)).toEqual(
          expectedIds
        )
      }
    }
  )

  it.each(["cash-flow", "monthly-review", "purchase-date"] as const)(
    "sorts missing and invalid dates deterministically in %s",
    (dateBasis) => {
      const datedTransactions = [
        transaction("a", {
          date: null,
          cashFlowDate: null,
          calculatedDate: null
        }),
        transaction("b", {
          date: "invalid-date",
          cashFlowDate: "invalid-date",
          calculatedDate: "invalid-date"
        }),
        transaction("c", {
          date: "2026-09-27T12:00:00.000Z",
          cashFlowDate: "2026-09-27",
          calculatedDate: "2026-09-27"
        })
      ]

      for (const response of [
        datedTransactions,
        [...datedTransactions].reverse()
      ]) {
        expect(
          sortTransactions(response, "date-desc", dateBasis).map(({ id }) => id)
        ).toEqual(["c", "a", "b"])
        expect(
          sortTransactions(response, "date-asc", dateBasis).map(({ id }) => id)
        ).toEqual(["a", "b", "c"])
      }
    }
  )
})
