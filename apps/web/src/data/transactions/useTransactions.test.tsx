// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import type { QueryTransactionInputDto } from "@fina/types"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTransactions } from "./useTransactions"

const api = vi.hoisted(() => ({ findAll: vi.fn() }))
vi.mock("@/api/generated", () => ({
  transactionsControllerFindAll: api.findAll
}))

beforeEach(() => api.findAll.mockReset())
afterEach(cleanup)

describe("transaction review-month queries", () => {
  it("requests and caches each selected month set independently", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } }
    })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const options: QueryTransactionInputDto = {
      groupId: "10",
      page: 1,
      pageSize: 5000,
      dateBasis: "monthly-review",
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 2, 31),
      reviewMonths: ["2026-01", "2026-03"]
    }
    api.findAll
      .mockResolvedValueOnce({ data: [], totalCount: 3 })
      .mockResolvedValueOnce({ data: [], totalCount: 1 })

    const { result, rerender } = renderHook(
      ({ query }) => useTransactions(query),
      { wrapper, initialProps: { query: options } }
    )
    await waitFor(() => expect(result.current.data?.totalCount).toBe(3))
    expect(api.findAll).toHaveBeenLastCalledWith({
      groupId: "10",
      page: 0,
      pageSize: 5000,
      dateBasis: "monthly-review",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      reviewMonths: ["2026-01", "2026-03"]
    })

    rerender({ query: { ...options, reviewMonths: ["2026-02"] } })
    await waitFor(() => expect(result.current.data?.totalCount).toBe(1))
    expect(api.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ reviewMonths: ["2026-02"] })
    )
    rerender({ query: options })
    await waitFor(() => expect(result.current.data?.totalCount).toBe(3))
    expect(api.findAll).toHaveBeenCalledTimes(2)
    client.clear()
  })

  it("sends every expanded criterion and caches changes independently", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } }
    })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const base: QueryTransactionInputDto = { groupId: "10", page: 1 }
    const criteria: Partial<QueryTransactionInputDto>[] = [
      { accountIdList: ["11"] },
      { cardList: ["71", "-1"] },
      { importSource: "imported" },
      { importIdList: ["31"] },
      { minValue: -100 },
      { maxValue: 0 },
      { minValue: 0, maxValue: 0 }
    ]
    api.findAll.mockResolvedValue({ data: [], totalCount: 0 })
    const { result, rerender } = renderHook(
      ({ query }) => useTransactions(query),
      { wrapper, initialProps: { query: base } }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    for (const [index, criterion] of criteria.entries()) {
      rerender({ query: { ...base, ...criterion } })
      await waitFor(() => expect(api.findAll).toHaveBeenCalledTimes(index + 2))
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(api.findAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ groupId: "10", page: 0, ...criterion })
      )
    }
    rerender({ query: { ...base, ...criteria[0] } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.findAll).toHaveBeenCalledTimes(criteria.length + 1)
    client.clear()
  })
})
