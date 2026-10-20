// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useImportProfiles } from "./useImportProfiles"

const findProfiles = vi.hoisted(() => vi.fn())
vi.mock("@/api/generated", () => ({
  importsControllerFindProfiles: findProfiles
}))

afterEach(() => {
  cleanup()
  findProfiles.mockReset()
})

function setup(initialProps: { groupId?: string; fingerprint?: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  })
  return renderHook((props) => useImportProfiles(props), {
    initialProps,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  })
}

describe("saved import profiles", () => {
  it("waits for group and layout and scopes each generated-client request and cache", async () => {
    findProfiles.mockResolvedValue([])
    const { result, rerender } = setup({})
    expect(findProfiles).not.toHaveBeenCalled()
    rerender({ groupId: "10", fingerprint: "a".repeat(64) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(findProfiles).toHaveBeenLastCalledWith({
      groupId: "10",
      fingerprint: "a".repeat(64)
    })
    rerender({ groupId: "11", fingerprint: "a".repeat(64) })
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(findProfiles).toHaveBeenLastCalledWith({
      groupId: "11",
      fingerprint: "a".repeat(64)
    })
    rerender({ groupId: "11", fingerprint: "b".repeat(64) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(findProfiles).toHaveBeenLastCalledWith({
      groupId: "11",
      fingerprint: "b".repeat(64)
    })
  })

  it("rejects invalid saved profiles instead of applying an unsupported config", async () => {
    findProfiles.mockResolvedValue([{ id: "1", config: { version: 99 } }])
    const { result } = setup({ groupId: "10", fingerprint: "a".repeat(64) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})
