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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CustomValue, SaveCustomValue } from "@fina/types"
import { CustomValuesSection } from "./CustomValuesSection"

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn()
}))
vi.mock("@/api/generated", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  customValuesControllerFindAll: api.list,
  customValuesControllerCreate: api.create,
  customValuesControllerUpdate: api.update,
  customValuesControllerRemove: api.remove
}))
const categories = [
  {
    id: "8",
    name: "Shared costs",
    createdAt: "2026-01-01T00:00:00.000Z",
    groupId: "1",
    color: "teal" as const,
    icon: "tag" as const
  },
  {
    id: "9",
    name: "Vale",
    createdAt: "2026-01-01T00:00:00.000Z",
    groupId: "1",
    color: "sky" as const,
    icon: "tag" as const
  }
]
let records: CustomValue[]
const clients: QueryClient[] = []
const totals = { 8: -100, 9: 40 }
async function chooseColor(
  user: ReturnType<typeof userEvent.setup>,
  name: string
) {
  await user.click(screen.getByRole("combobox", { name: "Tile color" }))
  await user.click(screen.getByRole("option", { name }))
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  clients.push(client)
  return render(
    <QueryClientProvider client={client}>
      <CustomValuesSection
        groupId="1"
        categories={categories}
        categoryTotals={totals}
      />
    </QueryClientProvider>
  )
}
describe("workspace custom tiles", () => {
  beforeEach(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => undefined
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    vi.clearAllMocks()
    records = [
      {
        id: "1",
        groupId: "1",
        title: "My Custom Tile",
        color: "violet",
        columnSpan: 1,
        expression: "{{Shared costs}} * 0.3",
        resolvedExpression: "{{category:8}} * 0.3"
      }
    ]
    api.list.mockImplementation(async () =>
      records.map((tile) => ({ ...tile }))
    )
    api.create.mockImplementation(
      async ({ requestBody }: { requestBody: SaveCustomValue }) => {
        const tile = {
          id: "2",
          groupId: "1",
          ...requestBody,
          color: requestBody.color ?? null,
          columnSpan: requestBody.columnSpan ?? 1,
          resolvedExpression: requestBody.expression
            .replace("{{My Custom Tile}}", "{{tile:1}}")
            .replace("{{Vale}}", "{{category:9}}")
        }
        records = [...records, tile]
        return tile
      }
    )
    api.update.mockImplementation(
      async ({
        id,
        requestBody
      }: {
        id: string
        requestBody: SaveCustomValue
      }) => {
        const tile = {
          id,
          groupId: "1",
          ...requestBody,
          color:
            requestBody.color === undefined
              ? (records.find((tile) => tile.id === id)?.color ?? null)
              : requestBody.color,
          columnSpan:
            requestBody.columnSpan ??
            records.find((tile) => tile.id === id)?.columnSpan ??
            1,
          resolvedExpression: requestBody.expression
        }
        records = records.map((current) => (current.id === id ? tile : current))
        return tile
      }
    )
    api.remove.mockImplementation(async ({ id }: { id: string }) => {
      records = records.filter((tile) => tile.id !== id)
      return { id }
    })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    clients.splice(0).forEach((client) => client.clear())
  })
  it("autocompletes categories and custom tiles with keyboard, previews chained values, and persists create/edit/delete", async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByRole("article", { name: "My Custom Tile" })
    await user.click(screen.getByRole("button", { name: "Add tile" }))
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Combined")
    expect(
      screen.getByRole("combobox", { name: "Tile color" })
    ).toHaveTextContent("No color")
    await chooseColor(user, "Teal")
    expect(screen.queryByText("Tile width")).not.toBeInTheDocument()
    expect(
      within(
        screen.getByRole("radiogroup", { name: "Tile width" })
      ).getAllByRole("radio")
    ).toHaveLength(2)
    expect(screen.getByRole("radio", { name: "One tile" })).toBeChecked()
    await user.click(screen.getByRole("radio", { name: "One tile" }))
    await user.keyboard("{ArrowRight}")
    expect(
      screen.getByRole("radio", { name: "Two tiles (full width)" })
    ).toBeChecked()
    const logic = screen.getByRole("combobox", { name: "Logic" })
    await user.click(logic)
    await user.paste("{{")
    expect(screen.getAllByRole("option")).toHaveLength(3)
    await user.keyboard("My{Enter}")
    expect(
      within(logic).getByLabelText("Custom tile: My Custom Tile")
    ).toBeVisible()
    expect(logic).not.toHaveTextContent("{{")
    await user.paste(" + {{Va")
    await user.keyboard("{ArrowDown}{Enter}")
    expect(within(logic).getByLabelText("Category: Vale")).toBeVisible()
    expect(logic).toHaveTextContent("My Custom Tile + Vale")
    expect(screen.getByText(/Preview:/)).toHaveTextContent(/10,00/)
    await user.click(screen.getByRole("button", { name: "Save tile" }))
    const tile = await screen.findByRole("article", { name: "Combined" })
    expect(tile).toHaveTextContent(/10,00/)
    expect(
      within(tile).getByRole("img", { name: "Tile color: teal" })
    ).toBeVisible()
    expect(api.create).toHaveBeenCalledWith({
      groupId: "1",
      requestBody: {
        title: "Combined",
        color: "teal",
        columnSpan: 2,
        expression: "{{My Custom Tile}} + {{Vale}}"
      }
    })
    await user.click(
      within(tile).getByRole("button", { name: "Edit Combined" })
    )
    expect(
      screen.getByRole("combobox", { name: "Tile color" })
    ).toHaveTextContent("Teal")
    expect(
      screen.getByRole("radio", { name: "Two tiles (full width)" })
    ).toBeChecked()
    await user.click(screen.getByRole("radio", { name: "One tile" }))
    await chooseColor(user, "Sky")
    const editLogic = screen.getByRole("combobox", { name: "Logic" })
    await user.click(editLogic)
    await user.keyboard("{Control>}a{/Control}")
    await user.paste("1 / 0")
    expect(screen.getByText(/Unavailable: Cannot divide by zero/)).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Save tile" }))
    await waitFor(() =>
      expect(tile).toHaveTextContent("Cannot divide by zero.")
    )
    expect(tile).not.toHaveTextContent(/Infinity|NaN/)
    expect(api.update).toHaveBeenCalledWith({
      groupId: "1",
      id: "2",
      requestBody: {
        title: "Combined",
        color: "sky",
        columnSpan: 1,
        expression: "1 / 0"
      }
    })
    expect(
      within(tile).getByRole("img", { name: "Tile color: sky" })
    ).toBeVisible()
    await user.click(
      within(tile).getByRole("button", { name: "Delete Combined" })
    )
    await user.click(within(tile).getByRole("button", { name: "Delete tile" }))
    await waitFor(() =>
      expect(
        screen.queryByRole("article", { name: "Combined" })
      ).not.toBeInTheDocument()
    )
    expect(api.remove).toHaveBeenCalledWith({ groupId: "1", id: "2" })
  })
  it("closes suggestions before the editor on Escape, rejects syntax errors, and keeps drafts after a failed save", async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByRole("article")
    await user.click(screen.getByRole("button", { name: "Add tile" }))
    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "Keep draft"
    )
    const logic = screen.getByRole("combobox", { name: "Logic" })
    await user.click(logic)
    await user.paste("{{")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(screen.getByRole("form", { name: "New custom tile" })).toBeVisible()
    await user.keyboard("{Control>}a{/Control}")
    await user.paste("1 +")
    await user.click(screen.getByRole("button", { name: "Save tile" }))
    expect(api.create).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("incomplete")
    await user.click(logic)
    await user.keyboard("{Control>}a{/Control}")
    await user.paste("42")
    api.create.mockRejectedValueOnce(new Error("Network failure"))
    await user.click(screen.getByRole("button", { name: "Save tile" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save")
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Keep draft"
    )
    expect(logic).toHaveTextContent("42")
  })
  it("starts without color, persists that choice, and allows assigning and clearing a color from the dropdown", async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByRole("article")
    await user.click(screen.getByRole("button", { name: "Add tile" }))
    expect(
      screen.getByRole("combobox", { name: "Tile color" })
    ).toHaveTextContent("No color")
    await user.click(screen.getByRole("combobox", { name: "Tile color" }))
    await user.keyboard("{Escape}")
    expect(screen.getByRole("form", { name: "New custom tile" })).toBeVisible()
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "No color fixture"
    )
    await user.click(screen.getByRole("combobox", { name: "Logic" }))
    await user.paste("2 * 3")
    await user.click(screen.getByRole("button", { name: "Save tile" }))
    const tile = await screen.findByRole("article", {
      name: "No color fixture"
    })
    expect(
      within(tile).queryByRole("img", { name: /Tile color:/ })
    ).not.toBeInTheDocument()
    expect(api.create).toHaveBeenCalledWith({
      groupId: "1",
      requestBody: {
        title: "No color fixture",
        color: null,
        columnSpan: 1,
        expression: "2 * 3"
      }
    })
    await user.click(
      within(tile).getByRole("button", { name: "Edit No color fixture" })
    )
    expect(
      screen.getByRole("combobox", { name: "Tile color" })
    ).toHaveTextContent("No color")
    await chooseColor(user, "Teal")
    await user.click(screen.getByRole("button", { name: "Save tile" }))
    await waitFor(() =>
      expect(
        within(tile).getByRole("img", { name: "Tile color: teal" })
      ).toBeVisible()
    )
    await user.click(
      within(tile).getByRole("button", { name: "Edit No color fixture" })
    )
    await chooseColor(user, "No color")
    await user.click(screen.getByRole("button", { name: "Save tile" }))
    await waitFor(() =>
      expect(
        within(tile).queryByRole("img", { name: /Tile color:/ })
      ).not.toBeInTheDocument()
    )
    expect(api.update).toHaveBeenLastCalledWith({
      groupId: "1",
      id: "2",
      requestBody: {
        title: "No color fixture",
        color: null,
        columnSpan: 1,
        expression: "2 * 3"
      }
    })
  })
})
