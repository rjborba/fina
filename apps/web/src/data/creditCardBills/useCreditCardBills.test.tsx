// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import type { CreditCardBillListQuery } from "@fina/types"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useCreditCardBills } from "./useCreditCardBills"

const api = vi.hoisted(() => ({ findAll: vi.fn() }))
vi.mock("@/api/generated", () => ({
  ApiError: class ApiError extends Error {},
  creditCardBillsControllerFindAll: api.findAll,
  creditCardBillsControllerFindOne: vi.fn()
}))

beforeEach(() => api.findAll.mockReset())
afterEach(cleanup)

describe("credit-card bill review-month queries", () => {
  it("requests and caches each selected month set independently", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } }
    })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const query: CreditCardBillListQuery = {
      groupId: "10",
      dateBasis: "monthly-review",
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 2, 31),
      reviewMonths: ["2026-01", "2026-03"]
    }
    api.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    const { result, rerender } = renderHook(
      ({ options }) => useCreditCardBills(options),
      { wrapper, initialProps: { options: query } }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.findAll).toHaveBeenLastCalledWith({
      groupId: "10",
      dateBasis: "monthly-review",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      reviewMonths: ["2026-01", "2026-03"]
    })

    rerender({ options: { ...query, reviewMonths: ["2026-02"] } })
    await waitFor(() => expect(api.findAll).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ reviewMonths: ["2026-02"] })
    )
    rerender({ options: query })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.findAll).toHaveBeenCalledTimes(2)
    client.clear()
  })

  it("sends purchase filters before bill aggregation and caches each criterion", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } }
    })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const base: CreditCardBillListQuery = { groupId: "10" }
    const criteria: Partial<CreditCardBillListQuery>[] = [
      { accountIdList: ["11"] },
      { creditCardIdList: ["71", "-1"] },
      { categoryIdList: ["20", "-1"] },
      { search: "fixture" },
      { importSource: "manual" },
      { importIdList: ["31"] },
      { minValue: -100 },
      { maxValue: 0 },
      { minValue: 0, maxValue: 0 }
    ]
    api.findAll.mockResolvedValue([])
    const { result, rerender } = renderHook(
      ({ query }) => useCreditCardBills(query),
      { wrapper, initialProps: { query: base } }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    for (const [index, criterion] of criteria.entries()) {
      rerender({ query: { ...base, ...criterion } })
      await waitFor(() => expect(api.findAll).toHaveBeenCalledTimes(index + 2))
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(api.findAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ groupId: "10", ...criterion })
      )
    }
    rerender({ query: { ...base, ...criteria[0] } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.findAll).toHaveBeenCalledTimes(criteria.length + 1)
    client.clear()
  })
})
