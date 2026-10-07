import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCreditCardBill } from "./useCreditCardBills"
import dayjs from "dayjs"
import { useState } from "react"

export function useBillReviewMonth(
  accountId: string | undefined,
  billMonth: string
) {
  const { selectedGroup } = useActiveGroup()
  const { data, isLoading } = useCreditCardBill(
    selectedGroup?.id,
    accountId,
    billMonth || undefined,
    { allowMissing: true }
  )
  const key = `${selectedGroup?.id}:${accountId}:${billMonth}`
  const [override, setOverride] = useState<{
    key: string
    value: string
  } | null>(null)
  const defaultMonth = billMonth
    ? (data?.bill.reviewMonth ??
      dayjs(`${billMonth}-01`)
        .add(selectedGroup?.creditCardReviewMonthOffset ?? 0, "month")
        .format("YYYY-MM"))
    : ""

  return {
    reviewMonth: override?.key === key ? override.value : defaultMonth,
    setReviewMonth: (value: string) => setOverride({ key, value }),
    resetReviewMonth: () => setOverride(null),
    isLoading: !!accountId && !!billMonth && isLoading
  }
}
