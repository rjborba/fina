// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GroupOutput } from "@fina/types"
import { ReviewSettings } from "./ReviewSettings"

const save = vi.fn()
vi.mock("@/data/groups/useGroupsMutation", () => ({
  useGroupsMutation: () => ({
    updateReviewSettings: { mutateAsync: save, isPending: false }
  })
}))
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }))
const group: GroupOutput = {
  id: "10",
  name: "Household",
  createdAt: "2026-01-01T00:00:00.000Z",
  isOwner: true,
  creditCardReviewMonthOffset: 0
}

describe("group monthly-review preference", () => {
  beforeEach(() => {
    save.mockReset()
    save.mockResolvedValue({})
  })
  afterEach(cleanup)

  it("lets owners choose the previous month while explaining historical assignments", async () => {
    render(<ReviewSettings group={group} />)
    await userEvent.selectOptions(
      screen.getByLabelText("Credit-card bills belong to"),
      "-1"
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Save review preference" })
    )
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        id: "10",
        creditCardReviewMonthOffset: -1
      })
    )
    expect(
      screen.getByText(/Saved bill assignments stay unchanged/)
    ).toBeVisible()
  })

  it("shows members the preference without an editable control", () => {
    render(<ReviewSettings group={{ ...group, isOwner: false }} />)
    expect(screen.getByLabelText("Credit-card bills belong to")).toBeDisabled()
    expect(
      screen.queryByRole("button", { name: "Save review preference" })
    ).not.toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })
})
