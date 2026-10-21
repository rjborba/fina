// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { GroupDetails } from "./GroupDetails"

const mocks = vi.hoisted(() => ({
  group: { id: "1", name: "My finances", isOwner: true },
  rename: vi.fn(),
  toast: vi.fn()
}))
vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({ groups: [mocks.group] })
}))
vi.mock("@/data/groups/useGroupsMutation", () => ({
  useGroupsMutation: () => ({
    renameGroup: { mutateAsync: mocks.rename, isPending: false },
    removeGroup: {}
  })
}))
vi.mock("@/data/Invites/useInvites", () => ({
  useInvites: () => ({ data: [] })
}))
vi.mock("@/data/Invites/useInvitesMutation", () => ({
  useInvitesMutation: () => ({ addInvite: {}, removeInvite: {} })
}))
vi.mock("@/data/usersPerGroup/usersPerGroup", () => ({
  useUsersPerGroup: () => ({ data: [] })
}))
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }))
function open() {
  render(
    <MemoryRouter initialEntries={["/groups/1"]}>
      <Routes>
        <Route path="/groups/:groupId" element={<GroupDetails />} />
      </Routes>
    </MemoryRouter>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.group.isOwner = true
  mocks.rename.mockResolvedValue({})
})
afterEach(cleanup)
it("saves a trimmed workspace name", async () => {
  open()
  const user = userEvent.setup()
  expect(screen.getByRole("button", { name: "Save name" })).toBeDisabled()
  await user.clear(screen.getByLabelText("Workspace name"))
  await user.type(screen.getByLabelText("Workspace name"), "  Household  ")
  await user.click(screen.getByRole("button", { name: "Save name" }))
  expect(mocks.rename).toHaveBeenCalledWith({ id: "1", name: "Household" })
  expect(mocks.toast).toHaveBeenCalledWith({ title: "Workspace renamed" })
})
it("rejects blank names and preserves failed edits for retry", async () => {
  open()
  const user = userEvent.setup()
  const input = screen.getByLabelText("Workspace name")
  await user.clear(input)
  await user.click(screen.getByRole("button", { name: "Save name" }))
  expect(screen.getByRole("alert")).toHaveTextContent("between 1 and 120")
  expect(mocks.rename).not.toHaveBeenCalled()
  mocks.rename.mockRejectedValue(new Error("Failed"))
  await user.type(input, "Household")
  await user.click(screen.getByRole("button", { name: "Save name" }))
  expect(screen.getByRole("alert")).toHaveTextContent("Please try again")
  expect(input).toHaveValue("Household")
})
it("hides renaming from members", () => {
  mocks.group.isOwner = false
  open()
  expect(screen.queryByLabelText("Workspace name")).not.toBeInTheDocument()
})
