// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
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

  it("shows categories and selects one for an uncategorized transaction", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn().mockResolvedValue(undefined)

    render(<EditableSelectHarness onChange={onChange} />)

    await user.click(
      screen.getByRole("combobox", {
        name: "Change category for Groceries"
      })
    )
    await user.click(screen.getByRole("option", { name: "Food" }))

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
