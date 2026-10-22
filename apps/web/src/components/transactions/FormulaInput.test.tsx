// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { FormulaInput } from "./FormulaInput"

function Editor({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label htmlFor="formula">Logic</label>
      <FormulaInput
        id="formula"
        value={value}
        onChange={setValue}
        options={[
          {
            key: "category:1",
            name: "Category",
            token: "Category",
            kind: "Category"
          }
        ]}
      />
    </>
  )
}

describe("formula reference caret", () => {
  afterEach(cleanup)
  it("keeps both closing braces when closing a parenthesis immediately after autocomplete", async () => {
    const user = userEvent.setup()
    render(<Editor />)
    const input = screen.getByRole("combobox", { name: "Logic" })
    await user.click(input)
    await user.paste("({{Cat")
    await user.keyboard("{Enter})")
    expect(input).toHaveValue("({{Category}})")
  })
  it("puts the caret after both braces even when reselecting an unchanged reference", async () => {
    const user = userEvent.setup()
    render(<Editor initial="({{Category}}" />)
    const input = screen.getByRole("combobox", {
      name: "Logic"
    }) as HTMLInputElement
    await user.click(input)
    input.setSelectionRange(
      input.value.indexOf("}}"),
      input.value.indexOf("}}")
    )
    fireEvent.select(input)
    await user.click(screen.getByRole("option", { name: "Category Category" }))
    await user.keyboard(") + 2")
    expect(input).toHaveValue("({{Category}}) + 2")
  })
  it("reopens suggestions when returning to a completed reference and keeps its braces", async () => {
    const user = userEvent.setup()
    render(<Editor />)
    const input = screen.getByRole("combobox", { name: "Logic" })
    await user.click(input)
    await user.paste("({{Cat")
    await user.keyboard("{Enter}{ArrowLeft}{ArrowLeft}")
    expect(
      screen.getByRole("option", { name: "Category Category" })
    ).toBeVisible()
    await user.keyboard("{Enter})")
    expect(input).toHaveValue("({{Category}})")
  })
})
