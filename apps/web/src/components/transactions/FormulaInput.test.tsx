// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { FormulaInput } from "./FormulaInput"
import { formulaParts, selectFormula } from "./formulaEditor"

const options = [
  {
    key: "category:1",
    name: "Category",
    token: "Category",
    kind: "Category" as const
  },
  {
    key: "tile:2",
    name: "Custom tile",
    token: "Custom tile",
    kind: "Custom tile" as const
  }
]
function Editor({
  initial = "",
  disabled = false
}: {
  initial?: string
  disabled?: boolean
}) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label id="formula-label">Logic</label>
      <FormulaInput
        id="formula"
        value={value}
        onChange={setValue}
        options={options}
        disabled={disabled}
      />
      <output data-testid="source">{value}</output>
    </>
  )
}
const source = () => screen.getByTestId("source").textContent
describe("inline formula references", () => {
  afterEach(cleanup)
  it.each(["click", "Enter", "Tab"])(
    "inserts a reference chip with %s and types immediately after it without changing saved syntax",
    async (method) => {
      const user = userEvent.setup()
      render(<Editor />)
      const editor = screen.getByRole("combobox", { name: "Logic" })
      await user.click(editor)
      expect(editor).toHaveAttribute(
        "data-placeholder",
        "Type @ to add a category or custom tile"
      )
      await user.paste("(@Cat")
      if (method === "click")
        await user.click(
          screen.getByRole("option", { name: "Category Category" })
        )
      else await user.keyboard(`{${method}}`)
      expect(
        within(editor).getByLabelText("Category: Category")
      ).toHaveAttribute("contenteditable", "false")
      expect(editor).not.toHaveTextContent("{{")
      expect(editor).not.toHaveTextContent("@")
      await user.keyboard(") * 0.3")
      expect(source()).toBe("({{Category}}) * 0.3")
    }
  )
  it("matches multiword custom tiles, reports unmatched @ queries and dismisses suggestions with Escape", async () => {
    const user = userEvent.setup()
    render(<Editor />)
    const editor = screen.getByRole("combobox", { name: "Logic" })
    await user.click(editor)
    await user.paste("@")
    expect(screen.getAllByRole("option")).toHaveLength(2)
    await user.paste("cUsToM t")
    expect(screen.getAllByRole("option")).toHaveLength(1)
    await user.keyboard("{Enter}")
    expect(source()).toBe("{{Custom tile}}")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    await user.paste(" + @Missing")
    expect(screen.getByText("No matching categories or tiles.")).toBeVisible()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(source()).toBe("{{Custom tile}} + @Missing")
  })
  it.each([
    { initial: "(@Category) * {{Custom tile}}", caret: 4 },
    { initial: "(@Cat) * {{Custom tile}}", caret: 5 }
  ])(
    "replaces an @ query in $initial without removing following operators or references",
    async ({ initial, caret }) => {
      const user = userEvent.setup()
      render(<Editor initial={initial} />)
      const editor = screen.getByRole("combobox", { name: "Logic" })
      await user.click(editor)
      selectFormula(editor, caret)
      fireEvent(document, new Event("selectionchange"))
      await user.click(
        screen.getByRole("option", { name: "Category Category" })
      )
      expect(source()).toBe("({{Category}}) * {{Custom tile}}")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    }
  )
  it("renders existing/manual category and custom-tile references, explicit identifiers and unknown references safely", async () => {
    const user = userEvent.setup()
    render(<Editor initial="{{category:1}} + {{Custom tile}} + {{Missing}}" />)
    const editor = screen.getByRole("combobox", { name: "Logic" })
    expect(within(editor).getByLabelText("Category: Category")).toBeVisible()
    expect(
      within(editor).getByLabelText("Custom tile: Custom tile")
    ).toBeVisible()
    expect(editor).toHaveTextContent("{{Missing}}")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    await user.click(editor)
    selectFormula(editor, 0, source()!.length)
    await user.paste("{{Category}} + {{Custom tile}}")
    expect(editor).not.toHaveTextContent("{{")
    expect(source()).toBe("{{Category}} + {{Custom tile}}")
    const ambiguous = [
      ...options,
      { ...options[0], key: "category:3", token: "category:3" }
    ]
    expect(formulaParts("{{Category}}", ambiguous)[0].reference).toBeUndefined()
  })
  it("moves across a reference and deletes the whole chip with Backspace/Delete, with undo and redo", async () => {
    const user = userEvent.setup()
    render(<Editor initial="2 + {{Category}} * 3" />)
    const editor = screen.getByRole("combobox", { name: "Logic" })
    await user.click(within(editor).getByLabelText("Category: Category"))
    await user.keyboard("{Backspace}")
    expect(source()).toBe("2 +  * 3")
    await user.keyboard("{Control>}z{/Control}")
    expect(source()).toBe("2 + {{Category}} * 3")
    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}")
    expect(source()).toBe("2 +  * 3")
    await user.keyboard("{Control>}z{/Control}")
    await user.click(within(editor).getByLabelText("Category: Category"))
    await user.keyboard("{ArrowLeft}{Delete}")
    expect(source()).toBe("2 +  * 3")
  })
  it("preserves suffixes when typing before/after chips in an existing expression", async () => {
    const user = userEvent.setup()
    render(<Editor initial="({{Category}}) + {{Custom tile}}" />)
    const editor = screen.getByRole("combobox", { name: "Logic" })
    await user.click(within(editor).getByLabelText("Category: Category"))
    await user.paste(" * 0.5")
    expect(source()).toBe("({{Category}} * 0.5) + {{Custom tile}}")
    await user.click(within(editor).getByLabelText("Category: Category"))
    await user.keyboard("{ArrowLeft}")
    await user.paste("2 + ")
    expect(source()).toBe("(2 + {{Category}} * 0.5) + {{Custom tile}}")
  })
  it("copies/cuts raw syntax, pastes chips back, and never interprets pasted HTML", async () => {
    const user = userEvent.setup()
    render(<Editor initial="{{Category}} + {{Custom tile}}" />)
    const editor = screen.getByRole("combobox", { name: "Logic" })
    await user.click(editor)
    selectFormula(editor, 0, source()!.length)
    const copied = await user.copy()
    expect(copied?.getData("text/plain")).toBe("{{Category}} + {{Custom tile}}")
    await user.cut()
    expect(source()).toBe("")
    await user.paste(copied!)
    expect(source()).toBe("{{Category}} + {{Custom tile}}")
    expect(
      within(editor).getByLabelText("Custom tile: Custom tile")
    ).toBeVisible()
    await user.keyboard("{End}")
    await user.paste('<img src=x onerror="alert(1)">')
    expect(editor.querySelector("img")).toBeNull()
    expect(source()).toContain('<img src=x onerror="alert(1)">')
  })
  it("waits for composition, enforces the formula length limit and respects disabled editing", async () => {
    const user = userEvent.setup()
    const mounted = render(<Editor />)
    const editor = screen.getByRole("combobox", { name: "Logic" })
    await user.click(editor)
    fireEvent.compositionStart(editor)
    editor.textContent = "{{Category}}"
    fireEvent.input(editor)
    expect(source()).toBe("")
    fireEvent.compositionEnd(editor)
    expect(source()).toBe("{{Category}}")
    await user.keyboard("{End}")
    await user.paste("1".repeat(16000))
    expect(source()).toBe("{{Category}}")
    mounted.unmount()
    render(<Editor initial="{{Category}}" disabled />)
    const disabled = screen.getByRole("combobox", { name: "Logic" })
    expect(disabled).toHaveAttribute("aria-disabled", "true")
    expect(disabled).toHaveAttribute("contenteditable", "false")
    fireEvent.paste(disabled, { clipboardData: { getData: () => "2" } })
    expect(source()).toBe("{{Category}}")
  })
  it("handles virtual-keyboard deletion and undo as atomic reference operations", async () => {
    const user = userEvent.setup()
    render(<Editor initial="{{Category}}" />)
    const editor = screen.getByRole("combobox", { name: "Logic" })
    await user.click(within(editor).getByLabelText("Category: Category"))
    const remove = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "deleteContentBackward"
    })
    fireEvent(editor, remove)
    expect(remove.defaultPrevented).toBe(true)
    expect(source()).toBe("")
    fireEvent(
      editor,
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "historyUndo"
      })
    )
    expect(source()).toBe("{{Category}}")
    expect(within(editor).getByLabelText("Category: Category")).toBeVisible()
  })
})
