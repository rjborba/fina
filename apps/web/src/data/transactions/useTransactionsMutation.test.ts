import { describe, expect, it } from "vitest"
import type { QueryTransactionOutputDtoType } from "@fina/types"
import { updateTransactionInPage } from "./useTransactionsMutation"

const page = {
  totalCount: 2,
  data: [
    {
      id: "transaction-1",
      description: "Groceries",
      category: null
    },
    {
      id: "transaction-2",
      description: "Rent",
      category: {
        id: "category-home",
        name: "Home",
        icon: "house",
        color: "lime"
      }
    }
  ]
} as QueryTransactionOutputDtoType

describe("updateTransactionInPage", () => {
  it("updates only the matching cached transaction", () => {
    const updated = updateTransactionInPage(page, "transaction-1", {
      category: {
        id: "category-food",
        name: "Food",
        icon: "utensils",
        color: "violet"
      }
    })

    expect(updated?.data[0]).toMatchObject({
      id: "transaction-1",
      description: "Groceries",
      category: {
        id: "category-food",
        name: "Food",
        icon: "utensils",
        color: "violet"
      }
    })
    expect(updated?.data[1]).toBe(page.data[1])
  })

  it("leaves an unavailable cache entry unchanged", () => {
    expect(
      updateTransactionInPage(undefined, "transaction-1", {
        category: {
          id: "category-food",
          name: "Food",
          icon: "utensils",
          color: "violet"
        }
      })
    ).toBeUndefined()
  })
})
