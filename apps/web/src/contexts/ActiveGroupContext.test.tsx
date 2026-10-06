// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ActiveGroupProvider, useActiveGroup } from "./ActiveGroupContext"

const mocks = vi.hoisted(() => ({
  persistGroupId: vi.fn()
}))

vi.mock("@/data/groups/useGroups", () => ({
  useGroups: () => ({
    data: [
      {
        id: "1",
        createdAt: "2026-09-27T00:00:00.000Z",
        name: "My finances",
        isOwner: true
      }
    ],
    isPending: false
  })
}))

vi.mock("@/hooks/useLocalStorageState", () => ({
  default: () => ["", mocks.persistGroupId]
}))

function ActiveGroupName() {
  const { selectedGroup } = useActiveGroup()
  return <div>{selectedGroup?.name ?? "No active workspace"}</div>
}

describe("ActiveGroupProvider", () => {
  afterEach(() => {
    mocks.persistGroupId.mockReset()
  })

  it("exposes the first available group without waiting for persistence", async () => {
    render(
      <ActiveGroupProvider>
        <ActiveGroupName />
      </ActiveGroupProvider>
    )

    expect(screen.getByText("My finances")).toBeInTheDocument()
    await waitFor(() => expect(mocks.persistGroupId).toHaveBeenCalledWith("1"))
  })
})
