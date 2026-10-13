// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createDefaultTransactionFilter,
  type TransactionFilterType
} from "./TransactionFilterAtom"
import {
  readTransactionFilters,
  transactionFiltersStorageKey,
  writeTransactionFilters
} from "./transactionFilterStorage"

const key = transactionFiltersStorageKey("fixture-user", "group-1")
const savedFilter = {
  startDate: "2024-02-01",
  endDate: "2024-02-29",
  partialDescription: "fixture query",
  categoriesId: ["7", "-1"]
}

function filter(): TransactionFilterType {
  return {
    startDate: new Date(2024, 1, 1, 14, 30),
    endDate: new Date(2024, 1, 29, 9, 15),
    partialDescription: savedFilter.partialDescription,
    categoriesId: [...savedFilter.categoriesId]
  }
}

describe("transaction filter storage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 11, 12))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    localStorage.clear()
  })

  it("round-trips local calendar days as Date values with full-day boundaries", () => {
    writeTransactionFilters(key, {
      ...filter(),
      categoriesId: ["7", "-1", "7", "19", "-1"]
    })

    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
      ...savedFilter,
      categoriesId: ["7", "-1", "19"]
    })
    const restored = readTransactionFilters(key)
    expect(restored.startDate).toEqual(new Date(2024, 1, 1, 0, 0, 0, 0))
    expect(restored.endDate).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999))
    expect(restored.partialDescription).toBe(savedFilter.partialDescription)
    expect(restored.categoriesId).toEqual(["7", "-1", "19"])
    expect(readTransactionFilters(key).startDate).not.toBe(restored.startDate)
  })

  it("persists only the selected review months as a sorted, unique set", () => {
    writeTransactionFilters(key, {
      ...filter(),
      reviewMonths: ["2025-01", "2024-02", "2025-01", "2024-12"]
    })

    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
      ...savedFilter,
      reviewMonths: ["2024-02", "2024-12", "2025-01"]
    })
    expect(readTransactionFilters(key).reviewMonths).toEqual([
      "2024-02",
      "2024-12",
      "2025-01"
    ])
    writeTransactionFilters(key, filter())
    expect(readTransactionFilters(key).reviewMonths).toBeUndefined()
  })

  it("restores older date-range preferences without adding explicit review months", () => {
    localStorage.setItem(key, JSON.stringify(savedFilter))

    expect(readTransactionFilters(key)).toEqual({
      ...filter(),
      startDate: new Date(2024, 1, 1),
      endDate: new Date(2024, 1, 29, 23, 59, 59, 999)
    })
  })

  it("round-trips expanded criteria without losing signed or zero amount bounds", () => {
    writeTransactionFilters(key, {
      ...filter(),
      accountsId: ["11", "12", "11"],
      importSource: "imported",
      importsId: ["31", "32", "31"],
      minValue: -100.25,
      maxValue: 0
    })

    const criteria = {
      accountsId: ["11", "12"],
      importSource: "imported",
      importsId: ["31", "32"],
      minValue: -100.25,
      maxValue: 0
    }
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
      ...savedFilter,
      ...criteria
    })
    expect(readTransactionFilters(key)).toEqual(
      expect.objectContaining(criteria)
    )
    writeTransactionFilters(key, {
      ...filter(),
      importSource: "manual",
      minValue: 0,
      maxValue: 0
    })
    expect(readTransactionFilters(key)).toEqual(
      expect.objectContaining({
        importSource: "manual",
        minValue: 0,
        maxValue: 0
      })
    )
    expect(readTransactionFilters(key).importsId).toBeUndefined()
    expect(readTransactionFilters(key).accountsId).toBeUndefined()
  })

  it("keeps preferences isolated by both user and group with encoded scope IDs", () => {
    const otherGroup = transactionFiltersStorageKey("fixture-user", "group-2")
    const otherUser = transactionFiltersStorageKey("other-user", "group-1")
    writeTransactionFilters(key, filter())
    writeTransactionFilters(otherGroup, {
      ...filter(),
      partialDescription: "other group"
    })
    writeTransactionFilters(otherUser, {
      ...filter(),
      categoriesId: ["21"]
    })

    expect(key).toBe("transactionFilters:v1:fixture-user:group-1")
    expect(readTransactionFilters(key).partialDescription).toBe("fixture query")
    expect(readTransactionFilters(otherGroup).partialDescription).toBe(
      "other group"
    )
    expect(readTransactionFilters(otherUser).categoriesId).toEqual(["21"])
    expect(transactionFiltersStorageKey("user:a", "b/c")).toBe(
      "transactionFilters:v1:user%3Aa:b%2Fc"
    )
    expect(transactionFiltersStorageKey("a:b", "c")).not.toBe(
      transactionFiltersStorageKey("a", "b:c")
    )
  })

  it("persists only deduplicated card IDs, including unidentified, within the user and group scope", () => {
    const otherGroup = transactionFiltersStorageKey("fixture-user", "group-2")
    const otherUser = transactionFiltersStorageKey("other-user", "group-1")
    const withCardMetadata = {
      ...filter(),
      creditCardsId: ["71", "-1", "71", "72"],
      creditCards: [{ id: "71", name: "Synthetic nickname", last4: "0042" }]
    }
    writeTransactionFilters(key, withCardMetadata)
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
      ...savedFilter,
      creditCardsId: ["71", "-1", "72"]
    })
    expect(readTransactionFilters(key).creditCardsId).toEqual([
      "71",
      "-1",
      "72"
    ])
    expect(readTransactionFilters(otherGroup).creditCardsId).toBeUndefined()
    expect(readTransactionFilters(otherUser).creditCardsId).toBeUndefined()
    expect(localStorage.getItem(key)).not.toContain("Synthetic nickname")
    expect(localStorage.getItem(key)).not.toContain("0042")
  })

  it("uses fresh current-month defaults when no preference is saved", () => {
    const first = readTransactionFilters(key)
    expect(first).toEqual(createDefaultTransactionFilter())
    first.categoriesId.push("7")
    vi.setSystemTime(new Date(2026, 10, 2, 12))
    const next = readTransactionFilters(key)
    expect(next.startDate).toEqual(new Date(2026, 10, 1))
    expect(next.endDate).toEqual(new Date(2026, 10, 30, 23, 59, 59, 999))
    expect(next.categoriesId).toEqual([])
  })

  it("accepts preferences at the storage-only bounds", () => {
    const categoriesId = Array.from({ length: 199 }, (_, index) =>
      String(index)
    )
    categoriesId.push("1".repeat(20))
    writeTransactionFilters(key, {
      ...filter(),
      partialDescription: "x".repeat(1000),
      categoriesId
    })
    expect(readTransactionFilters(key).partialDescription).toHaveLength(1000)
    expect(readTransactionFilters(key).categoriesId).toEqual(categoriesId)
  })

  it("accepts up to 120 canonical review months", () => {
    const reviewMonths = Array.from({ length: 120 }, (_, index) => {
      const year = 2020 + Math.floor(index / 12)
      const month = String((index % 12) + 1).padStart(2, "0")
      return `${year}-${month}`
    })

    writeTransactionFilters(key, { ...filter(), reviewMonths })
    expect(readTransactionFilters(key).reviewMonths).toEqual(reviewMonths)
  })

  it.each([
    ["non-leap February", { ...savedFilter, endDate: "2025-02-29" }],
    ["rolled-over day", { ...savedFilter, endDate: "2024-04-31" }],
    ["invalid month", { ...savedFilter, endDate: "2024-13-01" }],
    ["ISO timestamp", { ...savedFilter, startDate: "2024-02-01T00:00:00Z" }],
    ["un-padded day", { ...savedFilter, startDate: "2024-2-1" }],
    ["reversed range", { ...savedFilter, startDate: "2024-03-01" }],
    ["missing date", { ...savedFilter, startDate: undefined }],
    [
      "oversized query",
      { ...savedFilter, partialDescription: "x".repeat(1001) }
    ],
    ["empty category", { ...savedFilter, categoriesId: [""] }],
    ["invalid category", { ...savedFilter, categoriesId: ["category-7"] }],
    ["negative category", { ...savedFilter, categoriesId: ["-2"] }],
    ["invalid account", { ...savedFilter, accountsId: ["account-1"] }],
    ["uncategorized account", { ...savedFilter, accountsId: ["-1"] }],
    ["invalid import", { ...savedFilter, importsId: ["import-1"] }],
    ["invalid import source", { ...savedFilter, importSource: "csv" }],
    ["string amount", { ...savedFilter, minValue: "-100" }],
    ["null amount", { ...savedFilter, maxValue: null }],
    ["reversed amount range", { ...savedFilter, minValue: 0, maxValue: -1 }],
    ["oversized category", { ...savedFilter, categoriesId: ["1".repeat(21)] }],
    [
      "oversized category list",
      { ...savedFilter, categoriesId: Array.from({ length: 201 }, () => "7") }
    ],
    ["empty review months", { ...savedFilter, reviewMonths: [] }],
    ["single month string", { ...savedFilter, reviewMonths: "2024-02" }],
    ["invalid review month", { ...savedFilter, reviewMonths: ["2024-13"] }],
    ["year zero review month", { ...savedFilter, reviewMonths: ["0000-01"] }],
    ["un-padded review month", { ...savedFilter, reviewMonths: ["2024-2"] }],
    ["review day", { ...savedFilter, reviewMonths: ["2024-02-01"] }],
    [
      "oversized review months",
      {
        ...savedFilter,
        reviewMonths: Array.from({ length: 121 }, () => "2024-02")
      }
    ],
    ["null", null],
    ["array", []]
  ])(
    "falls back for %s instead of partially applying invalid data",
    (_, saved) => {
      localStorage.setItem(key, JSON.stringify(saved))
      expect(readTransactionFilters(key)).toEqual(
        createDefaultTransactionFilter()
      )
    }
  )

  it("falls back for corrupt or excessively large JSON before parsing", () => {
    localStorage.setItem(key, "{")
    expect(readTransactionFilters(key)).toEqual(
      createDefaultTransactionFilter()
    )
    localStorage.setItem(
      key,
      JSON.stringify({ ...savedFilter, ignored: "x".repeat(16_384) })
    )
    expect(readTransactionFilters(key)).toEqual(
      createDefaultTransactionFilter()
    )
  })

  it("strips unknown saved fields and writes only allowlisted preferences", () => {
    localStorage.setItem(
      key,
      JSON.stringify({ ...savedFilter, amount: 123, transactions: [] })
    )
    expect(Object.keys(readTransactionFilters(key)).sort()).toEqual(
      Object.keys(savedFilter).sort()
    )

    const withUnrelatedFields = {
      ...filter(),
      userId: "fixture-user",
      groupId: "group-1",
      token: "not-a-token",
      transactions: [{ value: 123, description: "not persisted" }],
      signedUrl: "not-a-url"
    }
    writeTransactionFilters(key, withUnrelatedFields)
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(savedFilter)
  })

  it.each([
    ["invalid Date", { startDate: new Date("invalid") }],
    ["reversed range", { startDate: new Date(2024, 2, 1) }],
    ["oversized query", { partialDescription: "x".repeat(1001) }],
    ["invalid category", { categoriesId: ["not-an-id"] }],
    ["invalid account", { accountsId: ["not-an-id"] }],
    ["invalid import", { importsId: ["not-an-id"] }],
    ["nonfinite minimum", { minValue: Number.NEGATIVE_INFINITY }],
    ["nonfinite maximum", { maxValue: Number.POSITIVE_INFINITY }],
    ["NaN value", { minValue: Number.NaN }],
    ["reversed amount bounds", { minValue: 20, maxValue: -20 }],
    ["invalid review months", { reviewMonths: ["2024-13"] }],
    ["empty review months", { reviewMonths: [] }]
  ])("does not overwrite valid preferences with an %s", (_, invalid) => {
    writeTransactionFilters(key, filter())
    const previous = localStorage.getItem(key)
    expect(() =>
      writeTransactionFilters(key, { ...filter(), ...invalid })
    ).not.toThrow()
    expect(localStorage.getItem(key)).toBe(previous)
  })

  it("silently degrades when browser storage throws", () => {
    const log = vi.spyOn(console, "log")
    const warn = vi.spyOn(console, "warn")
    const error = vi.spyOn(console, "error")
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable")
    })

    expect(readTransactionFilters(key)).toEqual(
      createDefaultTransactionFilter()
    )
    expect(() => writeTransactionFilters(key, filter())).not.toThrow()
    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it("also tolerates browser storage access being blocked entirely", () => {
    vi.spyOn(globalThis, "localStorage", "get").mockImplementation(() => {
      throw new Error("Storage access blocked")
    })
    expect(readTransactionFilters(key)).toEqual(
      createDefaultTransactionFilter()
    )
    expect(() => writeTransactionFilters(key, filter())).not.toThrow()
  })
})
