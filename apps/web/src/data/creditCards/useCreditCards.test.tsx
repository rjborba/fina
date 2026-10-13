// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useCreditCards } from "./useCreditCards"

const list = vi.hoisted(() => vi.fn().mockResolvedValue([]))
vi.mock("@/api/generated", () => ({ creditCardsControllerFindAll: list }))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function wrapper(client: QueryClient) {
  return function Provider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe("credit-card queries", () => {
  it("fetches the current group only and distinguishes parent and archived scope in the cache", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const { result, rerender } = renderHook((props) => useCreditCards(props), {
      initialProps: {
        groupId: "1",
        accountId: undefined as string | undefined,
        includeArchived: false
      },
      wrapper: wrapper(client)
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(list).toHaveBeenLastCalledWith({
      groupId: "1",
      accountId: undefined,
      includeArchived: false
    })
    rerender({ groupId: "1", accountId: "2", includeArchived: true })
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({
        groupId: "1",
        accountId: "2",
        includeArchived: true
      })
    )
    rerender({ groupId: "3", accountId: "2", includeArchived: true })
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({
        groupId: "3",
        accountId: "2",
        includeArchived: true
      })
    )
    expect(client.getQueryCache().getAll()).toHaveLength(3)
  })

  it("does not fetch without a selected group", () => {
    const client = new QueryClient()
    renderHook(() => useCreditCards({}), { wrapper: wrapper(client) })
    expect(list).not.toHaveBeenCalled()
  })
})
