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
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { EditableSelect } from "./EditableSelectCell"

const options = [
  {
    id: "category-food",
    name: "Food",
    icon: "utensils" as const,
    color: "violet" as const
  },
  {
    id: "category-home",
    name: "Home",
    icon: "house" as const,
    color: "lime" as const
  }
]

function EditableSelectHarness({
  onChange,
  value = null
}: {
  onChange: (value: string | null) => Promise<unknown>
  value?: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <EditableSelect
      ariaLabel="Change category for Groceries"
      value={value}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={onChange}
    />
  )
}

describe("EditableSelect", () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => undefined
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
  })

  afterEach(cleanup)

  it("renders an end-aligned colored-dot chip while retaining readable choices and category editing", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn().mockResolvedValue(undefined)
    render(<EditableSelectHarness value="category-food" onChange={onChange} />)
    const trigger = screen.getByRole("combobox", {
      name: "Change category for Groceries"
    })
    expect(trigger).toHaveClass(
      "justify-end",
      "text-right",
      "w-auto",
      "max-w-full",
      "min-w-0"
    )
    expect(trigger).toHaveAttribute("title", "Food")
    const chip = trigger.querySelector("[data-category-chip]")!
    expect(chip).toHaveClass("rounded-full", "border", "gap-2", "min-w-0")
    expect(chip.querySelector("[data-category-dot]")).toHaveClass(
      "size-2",
      "bg-violet-500"
    )
    expect(chip.querySelector("svg")).toBeNull()
    expect(within(trigger).getByText("Food")).toHaveClass("truncate")
    await user.click(trigger)
    for (const option of screen.getAllByRole("option")) {
      expect(option).not.toHaveClass("justify-end")
      expect(option).not.toHaveClass("text-right")
    }
    expect(
      screen
        .getByRole("option", { name: "Home" })
        .querySelector(".flex.items-center.gap-2")
    ).not.toHaveClass("justify-end")
    await user.click(screen.getByRole("option", { name: "Home" }))
    expect(onChange).toHaveBeenLastCalledWith("category-home")
    expect(trigger).toHaveTextContent("Home")
    expect(trigger).toHaveAttribute("title", "Home")
    expect(within(trigger).getByText("Home").parentElement).toHaveClass(
      "rounded-full"
    )
    await user.click(trigger)
    await user.click(screen.getByRole("option", { name: "Uncategorized" }))
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(trigger).toHaveTextContent("Uncategorized")
    expect(trigger).toHaveAttribute("title", "Uncategorized")
    expect(trigger.querySelector("[data-category-placeholder]")).toHaveClass(
      "text-foreground/35"
    )
    expect(trigger.querySelector("[data-category-dot]")).toBeNull()
    expect(trigger).toHaveClass("justify-end", "text-right")
  })

  it("shows categories and selects one for an uncategorized transaction", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn().mockResolvedValue(undefined)

    render(<EditableSelectHarness onChange={onChange} />)

    const placeholder = screen.getByRole("combobox", {
      name: "Change category for Groceries"
    })
    expect(placeholder).toHaveTextContent("Uncategorized")
    expect(placeholder).toHaveAttribute("title", "Uncategorized")
    expect(
      placeholder.querySelector("[data-category-placeholder]")
    ).toHaveClass("rounded-full", "border", "text-foreground/35")
    expect(placeholder.querySelector("[data-category-dot]")).toBeNull()
    await user.click(placeholder)
    await user.click(screen.getByRole("option", { name: "Food" }))

    expect(onChange).toHaveBeenCalledWith("category-food")
    expect(placeholder).toHaveTextContent("Food")
    expect(placeholder.querySelector("[data-category-placeholder]")).toBeNull()
  })

  it("restores the muted placeholder when assigning a category fails", async () => {
    const user = userEvent.setup()
    const onChange = vi
      .fn()
      .mockRejectedValue(new Error("Fixture save failure"))
    render(<EditableSelectHarness onChange={onChange} />)
    const trigger = screen.getByRole("combobox", {
      name: "Change category for Groceries"
    })
    await user.click(trigger)
    await user.click(screen.getByRole("option", { name: "Food" }))
    await waitFor(() => expect(trigger).toHaveTextContent("Uncategorized"))
    expect(trigger.querySelector("[data-category-placeholder]")).toHaveClass(
      "text-foreground/35"
    )
    expect(onChange).toHaveBeenCalledWith("category-food")
  })

  it("can clear the current category", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn().mockResolvedValue(undefined)

    render(<EditableSelectHarness value="category-food" onChange={onChange} />)

    await user.click(
      screen.getByRole("combobox", {
        name: "Change category for Groceries"
      })
    )
    await user.click(screen.getByRole("option", { name: "Uncategorized" }))

    expect(onChange).toHaveBeenCalledWith(null)
  })
})
