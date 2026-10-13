// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAccountsMutation } from "./useBankAccountsMutation"

const api = vi.hoisted(() => ({ update: vi.fn() }))
vi.mock("@/api/generated", () => ({
  bankaccountsControllerCreate: vi.fn(),
  bankaccountsControllerRemove: vi.fn(),
  bankaccountsControllerUpdateInstitution: api.update
}))

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } }
  })
  const invalidate = vi
    .spyOn(queryClient, "invalidateQueries")
    .mockResolvedValue()
  const hook = renderHook(() => useAccountsMutation(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  })
  return { ...hook, queryClient, invalidate }
}

describe("institution mutation", () => {
  beforeEach(() => {
    api.update.mockReset()
  })
  afterEach(cleanup)

  it("uses the generated scoped endpoint and refreshes every branded account context", async () => {
    api.update.mockResolvedValue({ id: "1", institutionId: "itau" })
    const { result, invalidate } = setup()
    await act(async () => {
      await result.current.updateInstitution({ id: "1", institutionId: "itau" })
    })
    expect(api.update).toHaveBeenCalledWith({
      id: "1",
      requestBody: { institutionId: "itau" }
    })
    for (const key of [
      "bankaccounts",
      "transactions",
      "credit-card-bills",
      "imports",
      "import-profiles"
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] })
    }
  })

  it("persists an explicit Other choice and retains cached logos if the request fails", async () => {
    api.update.mockRejectedValue(new Error("Request failed"))
    const { result, queryClient, invalidate } = setup()
    const cached = [{ id: "1", institutionId: "inter" }]
    queryClient.setQueryData(["bankaccounts", "1"], cached)
    let failure: unknown
    await act(async () => {
      try {
        await result.current.updateInstitution({ id: "1", institutionId: null })
      } catch (error) {
        failure = error
      }
    })
    expect(failure).toBeInstanceOf(Error)
    expect(api.update).toHaveBeenCalledWith({
      id: "1",
      requestBody: { institutionId: null }
    })
    expect(invalidate).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(["bankaccounts", "1"])).toBe(cached)
  })
})
