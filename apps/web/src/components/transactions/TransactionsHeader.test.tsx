// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TransactionsHeader } from "./TransactionsHeader"

vi.mock("@/components/CreateTransactionModal", () => ({
  CreateTransactionModal: ({
    open,
    onOpenChange
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
  }) =>
    open ? (
      <section role="dialog" aria-label="Create entry">
        <button type="button" onClick={() => onOpenChange(false)}>
          Close entry
        </button>
      </section>
    ) : null
}))

afterEach(cleanup)

describe("transaction header", () => {
  it("opens create from the toolbar, C, and the existing N shortcut", () => {
    render(
      <TransactionsHeader totalCount={240}>
        <div role="toolbar" aria-label="Ledger controls" />
      </TransactionsHeader>
    )
    expect(screen.getByRole("heading", { name: "Transactions" })).toBeVisible()
    expect(screen.getByLabelText("240 entries")).toBeVisible()
    expect(
      screen.getByRole("toolbar", { name: "Ledger controls" })
    ).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: /New entry/ }))
    expect(screen.getByRole("dialog", { name: "Create entry" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Close entry" }))
    for (const key of ["c", "n"]) {
      fireEvent.keyDown(document.body, { key })
      expect(screen.getByRole("dialog", { name: "Create entry" })).toBeVisible()
      fireEvent.click(screen.getByRole("button", { name: "Close entry" }))
    }
  })

  it("allows create while a closed drawer stays mounted and blocks it inside an open dialog", () => {
    const { rerender } = render(
      <>
        <TransactionsHeader totalCount={0} />
        <aside role="dialog" aria-label="Totals" aria-hidden />
      </>
    )
    fireEvent.keyDown(document.body, { key: "c" })
    expect(screen.getByRole("dialog", { name: "Create entry" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Close entry" }))
    rerender(
      <>
        <TransactionsHeader totalCount={0} />
        <aside role="dialog" aria-label="Totals" />
      </>
    )
    fireEvent.keyDown(document.body, { key: "c" })
    expect(
      screen.queryByRole("dialog", { name: "Create entry" })
    ).not.toBeInTheDocument()
  })

  it("does not create while typing or when browser shortcut modifiers are held", () => {
    render(
      <>
        <TransactionsHeader totalCount={0} />
        <input aria-label="Description" />
        <textarea aria-label="Note" />
        <select aria-label="Category">
          <option>Groceries</option>
        </select>
        <div contentEditable data-testid="editable" />
        <div data-testid="empty-editable" />
        <div contentEditable="plaintext-only" data-testid="plain-editable" />
        <div role="textbox" aria-label="Rich description" tabIndex={0} />
        <div role="combobox" aria-label="Account" tabIndex={0} />
      </>
    )
    screen.getByTestId("empty-editable").setAttribute("contenteditable", "")
    for (const target of [
      screen.getByRole("textbox", { name: "Description" }),
      screen.getByRole("textbox", { name: "Note" }),
      screen.getByRole("combobox", { name: "Category" }),
      screen.getByTestId("editable"),
      screen.getByTestId("empty-editable"),
      screen.getByTestId("plain-editable"),
      screen.getByRole("textbox", { name: "Rich description" }),
      screen.getByRole("combobox", { name: "Account" })
    ]) {
      fireEvent.keyDown(target, { key: "c" })
      fireEvent.keyDown(target, { key: "n" })
    }
    for (const modifier of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { shiftKey: true }
    ]) {
      fireEvent.keyDown(document.body, { key: "c", ...modifier })
    }
    expect(
      screen.queryByRole("dialog", { name: "Create entry" })
    ).not.toBeInTheDocument()
  })
})
