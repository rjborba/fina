// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Categories } from "./Categories"

const mocks = vi.hoisted(() => ({
  addCategory: vi.fn(),
  removeCategory: vi.fn(),
  updateCategoryAppearance: vi.fn()
}))

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({
    selectedGroup: {
      id: "1",
      createdAt: "2026-09-27T00:00:00.000Z",
      name: "My finances",
      isOwner: true
    }
  })
}))

vi.mock("@/data/categories/useCategories", () => ({
  useCategories: () => ({
    data: [
      {
        id: "10",
        createdAt: "2026-09-27T00:00:00.000Z",
        name: "Food",
        icon: "utensils",
        color: "violet",
        groupId: "1"
      }
    ]
  })
}))

vi.mock("@/data/categories/useCategoriesMutation", () => ({
  useCategoriesMutation: () => ({
    addCategory: mocks.addCategory,
    removeCategory: mocks.removeCategory,
    updateCategoryAppearance: mocks.updateCategoryAppearance
  })
}))

describe("Categories", () => {
  beforeEach(() => {
    mocks.addCategory.mockReset()
    mocks.addCategory.mockResolvedValue(undefined)
    mocks.removeCategory.mockReset()
    mocks.updateCategoryAppearance.mockReset()
    mocks.updateCategoryAppearance.mockResolvedValue(undefined)
  })

  afterEach(cleanup)

  it("creates a colored-dot label with a live chip preview and no icon picker", async () => {
    const user = userEvent.setup()
    render(<Categories />)

    await user.type(
      screen.getByRole("textbox", { name: "Category name" }),
      "Restaurants"
    )
    expect(
      screen.queryByRole("radiogroup", { name: "Category icon" })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("radio", { name: "Rose" }))
    const preview = screen.getByLabelText("Category preview")
    expect(preview).toHaveTextContent("Restaurants")
    expect(preview.querySelector("[data-category-dot]")).toHaveClass(
      "bg-rose-400",
      "rounded-full"
    )
    expect(preview.querySelector("svg")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Add category" }))

    await waitFor(() =>
      expect(mocks.addCategory).toHaveBeenCalledWith({
        name: "Restaurants",
        icon: "tag",
        color: "rose",
        groupId: "1"
      })
    )
  })

  it("renders saved categories as dot-and-name chips without legacy icons", () => {
    render(<Categories />)

    const chip = screen.getByText("Food").closest("[data-category-chip]")!
    expect(chip).toHaveClass("rounded-full", "border")
    expect(chip.querySelector("[data-category-dot]")).toHaveClass(
      "bg-violet-500"
    )
    expect(chip.querySelector("svg")).toBeNull()
  })

  it("updates the appearance of an existing category", async () => {
    const user = userEvent.setup()
    render(<Categories />)

    await user.click(
      screen.getByRole("button", { name: "Edit Food appearance" })
    )
    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).queryByRole("radiogroup", { name: "Category icon" })
    ).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole("radio", { name: "Amber" }))
    await user.click(
      within(dialog).getByRole("button", { name: "Save appearance" })
    )

    await waitFor(() =>
      expect(mocks.updateCategoryAppearance).toHaveBeenCalledWith("10", {
        icon: "utensils",
        color: "amber"
      })
    )
  })
})
