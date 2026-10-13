import { describe, expect, it, vi } from "vitest"
import {
  assignCategoryToTransactionSelection,
  assignCardToTransactionSelection,
  selectedCreditAccountId,
  selectTransactionRange,
  summarizeTransactionSelection,
  toggleTransactionSelection
} from "./transactionSelection"

describe("transaction selection", () => {
  it("offers card assignment only for loaded purchases from one credit account", () => {
    const account = {
      id: "10",
      name: "Shared card account",
      type: "credit",
      institutionId: null,
      dueDate: 10
    }
    const rows = [
      { id: "1", bankaccount: account },
      { id: "2", bankaccount: account }
    ]
    expect(selectedCreditAccountId(rows, new Set(["1", "2"]))).toBe("10")
    expect(selectedCreditAccountId(rows, new Set())).toBeNull()
    expect(
      selectedCreditAccountId(rows, new Set(["1", "not-loaded"]))
    ).toBeNull()
    expect(
      selectedCreditAccountId(
        [rows[0], { id: "2", bankaccount: { ...account, id: "11" } }],
        new Set(["1", "2"])
      )
    ).toBeNull()
    expect(
      selectedCreditAccountId(
        [
          rows[0],
          {
            id: "2",
            bankaccount: { ...account, type: "checkout", dueDate: null }
          }
        ],
        new Set(["1", "2"])
      )
    ).toBeNull()
    expect(
      selectedCreditAccountId([{ id: "1", bankaccount: null }], new Set(["1"]))
    ).toBeNull()
  })

  it("assigns or clears card metadata with observable partial failures", async () => {
    const creditCard = {
      id: "20",
      accountId: "10",
      name: "Family",
      last4: "4242",
      archived: false
    }
    const update = vi.fn((id: string) =>
      id === "2"
        ? Promise.reject(new Error("Update failed"))
        : Promise.resolve()
    )
    await expect(
      assignCardToTransactionSelection(["1", "2", "3"], creditCard, update)
    ).resolves.toEqual({ updatedCount: 2, failedCount: 1 })
    expect(update).toHaveBeenCalledWith("1", { creditCard })
    expect(update).toHaveBeenCalledWith("2", { creditCard })
    expect(update).toHaveBeenCalledWith("3", { creditCard })
    update.mockResolvedValue(undefined)
    await expect(
      assignCardToTransactionSelection(["1", "3"], null, update)
    ).resolves.toEqual({ updatedCount: 2, failedCount: 0 })
    expect(update).toHaveBeenCalledWith("1", { creditCard: null })
    await expect(
      assignCardToTransactionSelection([], creditCard, update)
    ).resolves.toEqual({ updatedCount: 0, failedCount: 0 })
  })

  it("selects an inclusive range while preserving an existing selection", () => {
    const selection = selectTransactionRange(
      ["one", "two", "three", "four"],
      "two",
      "four",
      new Set(["one"])
    )

    expect([...selection]).toEqual(["one", "two", "three", "four"])
  })

  it("selects only the target when shift-clicking without an anchor", () => {
    const selection = selectTransactionRange(
      ["one", "two", "three"],
      null,
      "two",
      new Set()
    )

    expect([...selection]).toEqual(["two"])
  })

  it("toggles a transaction without changing the original set", () => {
    const original = new Set(["one", "two"])

    expect([...toggleTransactionSelection(original, "two")]).toEqual(["one"])
    expect([...toggleTransactionSelection(original, "three")]).toEqual([
      "one",
      "two",
      "three"
    ])
    expect([...original]).toEqual(["one", "two"])
  })

  it("summarizes only selected loaded transactions without treating missing values as zero", () => {
    const transactions = [
      { id: "expense", value: -10 },
      { id: "income", value: 25 },
      { id: "missing", value: null },
      { id: "zero", value: 0 },
      { id: "unselected", value: -100 }
    ]

    expect(
      summarizeTransactionSelection(
        transactions,
        new Set(["expense", "income", "missing", "zero", "not-loaded"])
      )
    ).toEqual({ selectedTotal: 15, unavailableValueCount: 1 })
    expect(summarizeTransactionSelection(transactions, new Set())).toEqual({
      selectedTotal: 0,
      unavailableValueCount: 0
    })
  })

  it("excludes nonfinite values from the selected net amount", () => {
    expect(
      summarizeTransactionSelection(
        [
          { id: "valid", value: -20 },
          { id: "nan", value: Number.NaN },
          { id: "infinity", value: Number.POSITIVE_INFINITY }
        ],
        new Set(["valid", "nan", "infinity"])
      )
    ).toEqual({ selectedTotal: -20, unavailableValueCount: 2 })
  })

  it("assigns the same category to every selected ID using the existing update callback", async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const category = {
      id: "20",
      name: "Groceries",
      icon: "shopping-cart" as const,
      color: "lime" as const
    }

    await expect(
      assignCategoryToTransactionSelection(["one", "two"], category, update)
    ).resolves.toEqual({ updatedCount: 2, failedCount: 0 })
    expect(update).toHaveBeenCalledWith("one", { category })
    expect(update).toHaveBeenCalledWith("two", { category })
    expect(update).toHaveBeenCalledTimes(2)
  })

  it("clears categories and reports partial failures without skipping other rows", async () => {
    const update = vi.fn((id: string) => {
      if (id === "sync-failure") throw new Error("Synchronous update failure")
      if (id === "async-failure") {
        return Promise.reject(new Error("Async update failure"))
      }
      return Promise.resolve()
    })
    const ids = ["one", "sync-failure", "async-failure", "four"]

    await expect(
      assignCategoryToTransactionSelection(ids, null, update)
    ).resolves.toEqual({ updatedCount: 2, failedCount: 2 })
    expect(update).toHaveBeenCalledTimes(4)
    for (const id of ids) {
      expect(update).toHaveBeenCalledWith(id, { category: null })
    }
  })

  it("limits concurrent updates to eight while eventually attempting every selected transaction", async () => {
    const ids = Array.from({ length: 17 }, (_, index) => `transaction-${index}`)
    const pending: Array<() => void> = []
    const attemptedIds: string[] = []
    let activeCount = 0
    let peakCount = 0
    const update = vi.fn((id: string) => {
      attemptedIds.push(id)
      activeCount += 1
      peakCount = Math.max(peakCount, activeCount)
      return new Promise<void>((resolve) => {
        pending.push(() => {
          activeCount -= 1
          resolve()
        })
      })
    })

    const assignment = assignCategoryToTransactionSelection(ids, null, update)
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(8))
    expect(activeCount).toBe(8)
    pending.splice(0).forEach((resolve) => resolve())
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(16))
    pending.splice(0).forEach((resolve) => resolve())
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(17))
    pending.splice(0).forEach((resolve) => resolve())

    await expect(assignment).resolves.toEqual({
      updatedCount: 17,
      failedCount: 0
    })
    expect(peakCount).toBe(8)
    expect(activeCount).toBe(0)
    expect(new Set(attemptedIds)).toEqual(new Set(ids))
  })

  it("does not invoke update for an empty selection", async () => {
    const update = vi.fn()
    await expect(
      assignCategoryToTransactionSelection([], null, update)
    ).resolves.toEqual({ updatedCount: 0, failedCount: 0 })
    expect(update).not.toHaveBeenCalled()
  })
})
