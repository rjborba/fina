// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useCreditCardsMutation } from "./useCreditCardsMutation"

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn()
}))
vi.mock("@/api/generated", () => ({
  creditCardsControllerCreate: api.create,
  creditCardsControllerUpdate: api.update,
  creditCardsControllerRemove: api.remove
}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

function setup() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } }
  })
  const invalidate = vi
    .spyOn(client, "invalidateQueries")
    .mockResolvedValue(undefined)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return {
    ...renderHook(() => useCreditCardsMutation("1"), { wrapper }),
    invalidate
  }
}

describe("credit-card mutations", () => {
  it("uses generated scoped operations and refreshes all card-attributed contexts after success", async () => {
    api.create.mockResolvedValue({ id: "10" })
    api.update.mockResolvedValue({ id: "10" })
    api.remove.mockResolvedValue({ id: "10" })
    const { result, invalidate } = setup()
    await act(async () => {
      await result.current.addMutation.mutateAsync({
        accountId: "2",
        name: "Online virtual",
        last4: null
      })
    })
    expect(api.create).toHaveBeenCalledWith({
      requestBody: { accountId: "2", name: "Online virtual", last4: null }
    })
    await act(async () => {
      await result.current.updateMutation.mutateAsync({
        id: "10",
        name: "Renamed card",
        last4: "0042"
      })
    })
    expect(api.update).toHaveBeenCalledWith({
      id: "10",
      requestBody: { name: "Renamed card", last4: "0042" }
    })
    await act(async () => {
      await result.current.archiveMutation.mutateAsync("10")
    })
    expect(api.remove).toHaveBeenCalledWith({ id: "10" })
    for (const key of [
      "credit-cards",
      "transactions",
      "credit-card-bills",
      "imports",
      "import-profiles"
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key, "1"] })
    }
  })

  it("does not invalidate history or retry a rejected mutation", async () => {
    api.update.mockRejectedValue(new Error("Update failed"))
    const { result, invalidate } = setup()
    await act(async () => {
      await expect(
        result.current.updateMutation.mutateAsync({
          id: "10",
          name: "Renamed card"
        })
      ).rejects.toThrow("Update failed")
    })
    expect(api.update).toHaveBeenCalledOnce()
    expect(invalidate).not.toHaveBeenCalled()
  })
})
