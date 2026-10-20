// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { CreditCardBillDetail } from "@fina/types"
import { cardMetadataKey } from "@fina/types"
import { BillCardsBreakdown } from "./BillCardsBreakdown"

const summaries: CreditCardBillDetail["cardSummaries"] = [
  {
    cardName: "Mine",
    cardLast4: "4242",
    transactionCount: 2,
    total: -50,
    unavailableValueCount: 0
  },
  {
    cardName: "Family",
    cardLast4: null,
    transactionCount: 3,
    total: -80,
    unavailableValueCount: 0
  },
  {
    cardName: null,
    cardLast4: null,
    transactionCount: 1,
    total: 0,
    unavailableValueCount: 1
  }
]

afterEach(cleanup)

describe("bill card breakdown", () => {
  it("identifies cards and unknown amounts without treating them as separate bills", async () => {
    const onToggleCard = vi.fn()
    render(
      <BillCardsBreakdown
        summaries={summaries}
        roundingAdjustment={0}
        selectedIds={[cardMetadataKey(summaries[0])]}
        onToggleCard={onToggleCard}
      />
    )
    const section = screen.getByRole("region", { name: "Cards in this bill" })
    expect(section).toHaveTextContent("One shared bill")
    expect(section).toHaveTextContent("every purchase and refund")
    expect(section).not.toHaveTextContent("Archived")
    const mine = within(section).getByRole("button", {
      name: "Filter purchases by Mine · ••4242"
    })
    expect(mine).toHaveAttribute("aria-pressed", "true")
    expect(mine).toHaveTextContent("2 purchases")
    expect(mine).toHaveTextContent(/-R\$\s*50,00/)
    const unknown = within(section).getByRole("button", {
      name: "Filter purchases by Not identified"
    })
    expect(unknown).toHaveTextContent("1 purchase")
    expect(unknown).toHaveTextContent("1 without an amount")
    await userEvent.setup().click(unknown)
    expect(onToggleCard).toHaveBeenCalledWith("-1")
    expect(
      screen.queryByLabelText("Card subtotal rounding adjustment")
    ).not.toBeInTheDocument()
  })

  it("discloses sub-cent rounding explicitly without assigning it to a card", () => {
    const { rerender } = render(
      <BillCardsBreakdown
        summaries={summaries}
        roundingAdjustment={-0.01}
        selectedIds={[]}
        onToggleCard={vi.fn()}
      />
    )
    expect(
      screen.getByLabelText("Card subtotal rounding adjustment")
    ).toHaveTextContent(/Rounding adjustment.*-R\$\s*0,01/)
    expect(screen.getAllByRole("button")).toHaveLength(3)
    rerender(
      <BillCardsBreakdown
        summaries={[]}
        roundingAdjustment={0}
        selectedIds={[]}
        onToggleCard={vi.fn()}
      />
    )
    expect(
      screen.queryByRole("region", { name: "Cards in this bill" })
    ).not.toBeInTheDocument()
  })
})
