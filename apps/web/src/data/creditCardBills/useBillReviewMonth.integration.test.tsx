// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/api/generated"
import { useBillReviewMonth } from "./useBillReviewMonth"

const readBill = vi.hoisted(() => vi.fn())
vi.mock("@/api/generated", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/generated")>()),
  creditCardBillsControllerFindOne: readBill
}))
vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({
    selectedGroup: { id: "10", creditCardReviewMonthOffset: -1 }
  })
}))

const clients: QueryClient[] = []
beforeEach(() => {
  readBill.mockReset()
})
afterEach(() => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
})

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0 } }
  })
  clients.push(client)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("bill review default lookup", () => {
  it("uses the group default immediately when the bill does not exist", async () => {
    readBill.mockRejectedValue(
      new ApiError(
        { method: "GET", url: "/credit-card-bills/20/2026-07" },
        {
          url: "/credit-card-bills/20/2026-07",
          ok: false,
          status: 404,
          statusText: "Not Found",
          body: { code: "RESOURCE_NOT_FOUND" }
        },
        "Bill not found"
      )
    )
    const { result } = renderHook(() => useBillReviewMonth("20", "2026-07"), {
      wrapper
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.reviewMonth).toBe("2026-06")
    expect(readBill).toHaveBeenCalledTimes(1)
  })

  it("retries a transient failure and preserves the existing assignment", async () => {
    readBill
      .mockRejectedValueOnce(new Error("Temporary connection failure"))
      .mockResolvedValue({ bill: { reviewMonth: "2026-07" } })
    const { result } = renderHook(() => useBillReviewMonth("20", "2026-07"), {
      wrapper
    })
    await waitFor(() => expect(result.current.reviewMonth).toBe("2026-07"))
    expect(readBill).toHaveBeenCalledTimes(2)
  })
})
