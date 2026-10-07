import { Button } from "@/components/ui/button"
import { FinaSurface } from "@/components/ui/fina"
import { useGroupsMutation } from "@/data/groups/useGroupsMutation"
import { toast } from "@/hooks/use-toast"
import type { Group } from "@/data/groups/Groups"
import { useState } from "react"

export function ReviewSettings({ group }: { group: Group["Row"] }) {
  const { updateReviewSettings } = useGroupsMutation()
  const [selection, setSelection] = useState<0 | -1>(
    group.creditCardReviewMonthOffset === -1 ? -1 : 0
  )

  return (
    <FinaSurface className="p-5 sm:p-6">
      <h2 className="text-xl font-black uppercase tracking-[-0.035em]">
        Monthly review
      </h2>
      <p className="mt-2 max-w-2xl text-sm font-semibold text-fina-ink/65">
        Choose the default review month for new credit-card bills. Saved bill
        assignments stay unchanged. Each bill can be moved from its details.
      </p>
      <form
        className="mt-5 flex flex-wrap items-end gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          try {
            await updateReviewSettings.mutateAsync({
              id: group.id,
              creditCardReviewMonthOffset: selection
            })
            toast({
              title: "Monthly review preference saved",
              description: "Existing bills keep their assigned review month."
            })
          } catch {
            toast({
              title: "Could not save the monthly review preference",
              variant: "destructive"
            })
          }
        }}
      >
        <label className="flex flex-col gap-2 text-sm font-bold">
          Credit-card bills belong to
          <select
            className="h-11 border-2 border-fina-ink bg-fina-surface px-3 font-semibold"
            value={selection}
            disabled={!group.isOwner || updateReviewSettings.isPending}
            onChange={(event) =>
              setSelection(event.target.value === "-1" ? -1 : 0)
            }
          >
            <option value="0">Due-date month (July bill → July review)</option>
            <option value="-1">Previous month (July bill → June review)</option>
          </select>
        </label>
        {group.isOwner ? (
          <Button
            type="submit"
            variant="fina-primary"
            disabled={
              updateReviewSettings.isPending ||
              selection === group.creditCardReviewMonthOffset
            }
          >
            {updateReviewSettings.isPending
              ? "Saving…"
              : "Save review preference"}
          </Button>
        ) : (
          <p className="text-sm font-semibold">
            Only a group owner can change this preference.
          </p>
        )}
      </form>
    </FinaSurface>
  )
}
