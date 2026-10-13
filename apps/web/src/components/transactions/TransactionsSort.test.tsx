// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { TransactionsSort } from "./TransactionsSort"
import {
  DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
  type TransactionDisplayProperties
} from "./transactionDisplay"
import type { TransactionSortOption } from "./transactionSort"

function DisplayControls() {
  const [sort, setSort] = useState<TransactionSortOption>("date-desc")
  const [properties, setProperties] = useState<TransactionDisplayProperties>(
    DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
  )
  const [inline, setInline] = useState(true)

  return (
    <>
      <TransactionsSort
        value={sort}
        onValueChange={setSort}
        displayProperties={properties}
        onDisplayPropertiesChange={setProperties}
        inlineCreditCardTransactions={inline}
        onInlineCreditCardTransactionsChange={setInline}
      />
      <output aria-label="Current ordering">{sort}</output>
    </>
  )
}

describe("transaction Display options", () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => undefined
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
  })
  afterEach(cleanup)

  it("keeps sorting direction when selecting a field and leaves Display open", async () => {
    const user = userEvent.setup()
    render(<DisplayControls />)
    await user.click(screen.getByRole("button", { name: "Display options" }))
    const display = screen.getByRole("dialog", { name: "Display options" })
    const ordering = within(display).getByRole("combobox", { name: "Ordering" })
    expect(ordering).toHaveTextContent("Date")
    expect(
      within(display).getByRole("button", { name: "Sort ascending" })
    ).toHaveAttribute("title", "Date — newest first")
    await user.click(ordering)
    expect(
      screen.getAllByRole("option").map((option) => option.textContent)
    ).toEqual(["Date", "Amount", "Description", "Category"])
    await user.click(screen.getByRole("option", { name: "Description" }))
    expect(screen.getByLabelText("Current ordering")).toHaveTextContent(
      "description-desc"
    )
    expect(display).toBeVisible()
    await user.click(
      within(display).getByRole("button", { name: "Sort ascending" })
    )
    expect(screen.getByLabelText("Current ordering")).toHaveTextContent(
      "description-asc"
    )
    await user.click(ordering)
    await user.click(screen.getByRole("option", { name: "Amount" }))
    expect(screen.getByLabelText("Current ordering")).toHaveTextContent(
      "value-asc"
    )
    expect(
      within(display).getByRole("button", { name: "Sort descending" })
    ).toHaveAttribute("title", "Value — lowest first")
    expect(display).toBeVisible()
  })

  it("toggles properties independently and closes the nested selector before Display on Escape", async () => {
    const user = userEvent.setup()
    render(<DisplayControls />)
    const trigger = screen.getByRole("button", { name: "Display options" })
    await user.click(trigger)
    const display = screen.getByRole("dialog", { name: "Display options" })
    const properties = within(display).getByRole("group", {
      name: "Display properties"
    })
    const labels = [
      "Date",
      "Account",
      "Card",
      "Category",
      "Installment",
      "Amount",
      "Import"
    ]
    for (const name of labels) {
      expect(within(properties).getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    }
    await user.click(
      within(properties).getByRole("button", { name: "Category" })
    )
    expect(
      within(properties).getByRole("button", { name: "Category" })
    ).toHaveAttribute("aria-pressed", "false")
    for (const name of labels.filter((label) => label !== "Category")) {
      expect(within(properties).getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    }
    await user.click(within(properties).getByRole("button", { name: "Card" }))
    expect(
      within(properties).getByRole("button", { name: "Card" })
    ).toHaveAttribute("aria-pressed", "false")
    expect(
      within(properties).getByRole("button", { name: "Account" })
    ).toHaveAttribute("aria-pressed", "true")
    await user.click(within(properties).getByRole("button", { name: "Card" }))
    expect(
      within(properties).getByRole("button", { name: "Card" })
    ).toHaveAttribute("aria-pressed", "true")
    const inline = within(display).getByRole("switch", {
      name: "Inline credit card transactions"
    })
    await user.click(inline)
    expect(inline).not.toBeChecked()
    expect(display).toBeVisible()
    await user.click(
      within(display).getByRole("combobox", { name: "Ordering" })
    )
    expect(screen.getByRole("listbox")).toBeVisible()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(display).toBeVisible()
    await user.keyboard("{Escape}")
    expect(
      screen.queryByRole("dialog", { name: "Display options" })
    ).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
