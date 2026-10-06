import { describe, expect, it } from "vitest"
import {
  selectTransactionRange,
  toggleTransactionSelection
} from "./transactionSelection"

describe("transaction selection", () => {
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
})
