// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { CardPicker } from "./CardPicker"
import { formatCardLabel, type CardOption } from "./cardLabelFormat"

const cards: CardOption[] = [
  {
    id: "1",
    accountId: "2",
    name: "Main physical",
    last4: "0042",
    archived: false
  },
  {
    id: "2",
    accountId: "2",
    name: "Online virtual",
    last4: null,
    archived: false
  },
  {
    id: "3",
    accountId: "2",
    name: "Old additional",
    last4: "1234",
    archived: true
  }
]

beforeAll(() => {
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
})
afterEach(cleanup)

describe("CardPicker", () => {
  it("formats optional digits and unidentified cards without guessing a network", () => {
    expect(formatCardLabel(cards[0])).toBe("Main physical · ••0042")
    expect(formatCardLabel(cards[1])).toBe("Online virtual")
    expect(formatCardLabel(null)).toBe("Not identified")
  })

  it("searches active cards by nickname or final digits and selects the exact ID", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<CardPicker cards={cards} value={null} onChange={onChange} />)
    await user.click(screen.getByRole("combobox", { name: "Card" }))
    const popup = screen.getByRole("dialog", { name: "Card" })
    const search = within(popup).getByRole("combobox", { name: "Search cards" })
    expect(search).toHaveAccessibleName("Search cards")
    expect(
      screen.queryByRole("option", { name: /Old additional/ })
    ).not.toBeInTheDocument()
    await user.type(search, "0042")
    expect(
      screen.queryByRole("option", { name: "Online virtual" })
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole("option", { name: "Main physical · ••0042" })
    )
    expect(onChange).toHaveBeenCalledWith("1")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows a current archived card as read-only and supports clearing its attribution", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <CardPicker
        cards={cards.slice(0, 2)}
        value="3"
        selectedCard={cards[2]}
        onChange={onChange}
      />
    )
    const trigger = screen.getByRole("combobox", { name: "Card" })
    expect(trigger).toHaveTextContent("Old additional · ••1234")
    expect(trigger).toHaveTextContent("Archived")
    await user.click(trigger)
    const archived = screen.getByRole("option", { name: /Old additional/ })
    expect(archived).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("option", { name: "Not identified" }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it("does not silently turn an unavailable selected ID into unidentified", () => {
    const onChange = vi.fn()
    render(<CardPicker cards={cards} value="999" onChange={onChange} />)
    expect(screen.getByRole("combobox", { name: "Card" })).toHaveTextContent(
      "Card unavailable"
    )
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each(["disabled", "isLoading"] as const)(
    "blocks changes while %s",
    (pendingProp) => {
      render(
        <CardPicker
          cards={cards}
          value="1"
          onChange={vi.fn()}
          {...{ [pendingProp]: true }}
        />
      )
      expect(screen.getByRole("combobox", { name: "Card" })).toBeDisabled()
    }
  )
})
