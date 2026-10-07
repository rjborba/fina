// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CreditCardBillSummary } from "@fina/types"
import { BillReviewMonth } from "./BillReviewMonth"

const save = vi.fn()
vi.mock("@/data/creditCardBills/useCreditCardBillMutation", () => ({
  useCreditCardBillMutation: () => ({
    reviewMonthMutation: { mutateAsync: save, isPending: false }
  })
}))
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }))

const bill: CreditCardBillSummary = {
  accountId: "20",
  accountName: "Household card",
  billMonth: "2026-07",
  reviewMonth: "2026-07",
  dueDate: "2026-07-10",
  cashFlowDate: "2026-07-09",
  total: -200,
  transactionCount: 3,
  status: "reconciled",
  payment: {
    transactionId: "40",
    accountId: "21",
    accountName: "Checking",
    date: "2026-07-09",
    value: -200,
    description: "Synthetic payment"
  }
}

describe("whole-bill review assignment", () => {
  beforeEach(() => {
    save.mockReset()
    save.mockResolvedValue({})
  })
  afterEach(cleanup)

  it("moves a July bill to June without submitting changes to its due date or payment", async () => {
    render(<BillReviewMonth bill={bill} groupId="10" />)
    expect(
      screen.getByRole("button", { name: "Move whole bill" })
    ).toBeDisabled()
    await userEvent.click(screen.getByLabelText("Include in monthly review"))
    await userEvent.click(screen.getByRole("button", { name: "June 2026" }))
    await userEvent.click(
      screen.getByRole("button", { name: "Move whole bill" })
    )
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        groupId: "10",
        accountId: "20",
        billMonth: "2026-07",
        reviewMonth: "2026-06"
      })
    )
    expect(
      screen.getByText(
        /purchase dates, the due date, and payments stay the same/
      )
    ).toBeVisible()
  })
})
