import { BillMonthPicker } from "@/components/BillMonthPicker"
import { Button } from "@/components/ui/button"
import { FinaSurface } from "@/components/ui/fina"
import { useCreditCardBillMutation } from "@/data/creditCardBills/useCreditCardBillMutation"
import { toast } from "@/hooks/use-toast"
import type { CreditCardBillSummary } from "@fina/types"
import dayjs from "dayjs"
import { useState } from "react"

export function BillReviewMonth({
  bill,
  groupId
}: {
  bill: CreditCardBillSummary
  groupId: string
}) {
  const [reviewMonth, setReviewMonth] = useState(bill.reviewMonth)
  const { reviewMonthMutation } = useCreditCardBillMutation()

  return (
    <FinaSurface className="p-5 sm:p-6">
      <h2 className="text-xl font-black uppercase tracking-[-0.035em]">
        Monthly review assignment
      </h2>
      <p className="mt-2 max-w-2xl text-sm font-semibold text-fina-ink/65">
        All purchases, installments, fees, and credits in this bill belong to{" "}
        {dayjs(`${bill.reviewMonth}-01`).format("MMMM YYYY")}. Moving the bill
        changes its review month; purchase dates, the due date, and payments
        stay the same.
      </p>
      <form
        className="mt-4 flex flex-wrap items-start gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          try {
            await reviewMonthMutation.mutateAsync({
              groupId,
              accountId: bill.accountId,
              billMonth: bill.billMonth,
              reviewMonth
            })
            toast({
              title: "Bill review month updated",
              description:
                "All transactions in this bill now use the selected review month."
            })
          } catch {
            toast({
              title: "Could not change this bill’s review month",
              variant: "destructive"
            })
          }
        }}
      >
        <BillMonthPicker
          id="bill-review-month"
          label="Include in monthly review"
          value={reviewMonth}
          onValueChange={setReviewMonth}
          disabled={reviewMonthMutation.isPending}
          description="This changes the assignment for the whole bill."
          className="w-full max-w-md"
        />
        <Button
          type="submit"
          variant="fina-primary"
          className="mt-7"
          disabled={
            reviewMonthMutation.isPending || reviewMonth === bill.reviewMonth
          }
        >
          {reviewMonthMutation.isPending ? "Saving…" : "Move whole bill"}
        </Button>
      </form>
    </FinaSurface>
  )
}
