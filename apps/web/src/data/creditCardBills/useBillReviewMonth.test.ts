// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useBillReviewMonth } from "./useBillReviewMonth"

const state = vi.hoisted(() => ({
  savedReviewMonth: undefined as string | undefined,
  offset: -1,
  groupId: "10"
}))
vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({
    selectedGroup: {
      id: state.groupId,
      creditCardReviewMonthOffset: state.offset
    }
  })
}))
vi.mock("./useCreditCardBills", () => ({
  useCreditCardBill: () => ({
    data: state.savedReviewMonth
      ? { bill: { reviewMonth: state.savedReviewMonth } }
      : undefined,
    isLoading: false
  })
}))

beforeEach(() => {
  state.savedReviewMonth = undefined
  state.offset = -1
  state.groupId = "10"
})
afterEach(cleanup)

describe("new bill review defaults", () => {
  it("uses the previous calendar month across the year boundary", () => {
    const { result } = renderHook(() => useBillReviewMonth("20", "2027-01"))
    expect(result.current.reviewMonth).toBe("2026-12")
  })

  it("preserves an existing bill’s assignment even if the group preference changed", () => {
    state.savedReviewMonth = "2026-07"
    const { result } = renderHook(() => useBillReviewMonth("20", "2026-07"))
    expect(result.current.reviewMonth).toBe("2026-07")
  })

  it("does not carry an unsaved override across bill or group changes", () => {
    const { result, rerender } = renderHook(
      ({ month }) => useBillReviewMonth("20", month),
      { initialProps: { month: "2026-07" } }
    )
    act(() => result.current.setReviewMonth("2026-05"))
    expect(result.current.reviewMonth).toBe("2026-05")
    rerender({ month: "2026-08" })
    expect(result.current.reviewMonth).toBe("2026-07")
    state.groupId = "11"
    rerender({ month: "2026-07" })
    expect(result.current.reviewMonth).toBe("2026-06")
  })
})
