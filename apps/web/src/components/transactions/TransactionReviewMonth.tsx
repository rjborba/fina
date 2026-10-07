import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useState } from "react"

export function TransactionReviewMonth({
  reviewMonth,
  onSave
}: {
  reviewMonth: string | null
  onSave: (month: string) => Promise<void>
}) {
  const [month, setMonth] = useState(reviewMonth ?? "")
  const [saving, setSaving] = useState(false)

  return (
    <section
      aria-labelledby="transaction-review-title"
      className="border-t-[3px] border-fina-ink bg-fina-surface p-4 sm:p-5"
    >
      <h2 id="transaction-review-title" className="font-black uppercase">
        Monthly review
      </h2>
      <p className="mt-1 text-sm font-semibold text-fina-ink/65">
        Choose the month for this expense or income. The transaction date and
        cash flow stay unchanged.
      </p>
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault()
          setSaving(true)
          try {
            await onSave(month)
            toast({ title: "Transaction review month updated" })
          } catch {
            toast({
              title: "Could not change the review month",
              variant: "destructive"
            })
          } finally {
            setSaving(false)
          }
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-bold">
          Reference month
          <input
            type="month"
            className="h-10 border-2 border-fina-ink bg-fina-surface px-3"
            value={month}
            disabled={saving}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
        <Button
          type="submit"
          variant="fina-primary"
          disabled={
            saving ||
            month === reviewMonth ||
            !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
          }
        >
          {saving ? "Saving…" : "Save reference month"}
        </Button>
      </form>
    </section>
  )
}
