import { useId, useState } from "react"
import { CreateCreditCardInputSchema } from "@fina/types"
import { ApiError } from "@/api/generated"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useCreditCardsMutation } from "@/data/creditCards/useCreditCardsMutation"
import { useToast } from "@/hooks/use-toast"
import type { CardOption } from "./cardLabelFormat"

export function CardDialog({
  accountId,
  accountName,
  groupId,
  card,
  onOpenChange
}: {
  accountId: string
  accountName: string
  groupId: string
  card?: CardOption | null
  onOpenChange: (open: boolean) => void
}) {
  const nameId = useId()
  const last4Id = useId()
  const [name, setName] = useState(card?.name ?? "")
  const [last4, setLast4] = useState(card?.last4 ?? "")
  const [errors, setErrors] = useState<{
    name?: string
    last4?: string
    form?: string
  }>({})
  const [isSaving, setIsSaving] = useState(false)
  const { addMutation, updateMutation } = useCreditCardsMutation(groupId)
  const { toast } = useToast()
  const save = async () => {
    if (isSaving) return
    const parsed = CreateCreditCardInputSchema.safeParse({
      accountId,
      name,
      last4: last4.trim() || null
    })
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors
      setErrors({
        name: fields.name?.length
          ? name.trim()
            ? fields.name[0]
            : "Card nickname is required"
          : undefined,
        last4: fields.last4?.length
          ? "Enter exactly four digits, or leave this blank."
          : undefined,
        form: fields.accountId?.length
          ? "This credit account is unavailable. Close the dialog and try again."
          : undefined
      })
      return
    }
    setErrors({})
    setIsSaving(true)
    try {
      if (card) {
        await updateMutation.mutateAsync({
          id: card.id,
          name: parsed.data.name,
          last4: parsed.data.last4
        })
      } else {
        await addMutation.mutateAsync(parsed.data)
      }
      toast({ title: card ? "Card updated" : "Card added" })
      onOpenChange(false)
    } catch (error) {
      const conflict =
        error instanceof ApiError &&
        (error.body as { code?: unknown } | null)?.code ===
          "CREDIT_CARD_NAME_CONFLICT"
      setErrors({
        form: conflict
          ? "A card with this nickname already exists in this account."
          : "Could not save the card. Please try again."
      })
    } finally {
      setIsSaving(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!isSaving) onOpenChange(open)
      }}
    >
      <DialogContent
        aria-busy={isSaving}
        className="max-w-sm rounded-xl border-fina-grid bg-fina-surface p-5 shadow-fina-lg"
      >
        <DialogHeader>
          <DialogTitle className="text-base">
            {card ? "Edit card" : "Add card"}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {accountName}. All cards on this account share one bill and due day.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor={nameId} className="text-[13px]">
              Card nickname
            </Label>
            <Input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
              autoComplete="off"
              placeholder="e.g. Main physical, Family, or Online virtual"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${nameId}-error` : undefined}
              className="h-9 text-[13px]"
            />
            {errors.name ? (
              <p
                id={`${nameId}-error`}
                role="alert"
                className="text-xs text-red-600 dark:text-red-300"
              >
                {errors.name}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={last4Id} className="text-[13px]">
              Last 4 digits (optional)
            </Label>
            <Input
              id={last4Id}
              value={last4}
              onChange={(event) => setLast4(event.target.value)}
              disabled={isSaving}
              inputMode="numeric"
              autoComplete="off"
              placeholder="4242"
              aria-invalid={!!errors.last4}
              aria-describedby={`${last4Id}-hint${errors.last4 ? ` ${last4Id}-error` : ""}`}
              className="h-9 text-[13px]"
            />
            <p id={`${last4Id}-hint`} className="text-xs text-muted-foreground">
              Only the last four digits. Never enter a full card number or
              security code.
            </p>
            {errors.last4 ? (
              <p
                id={`${last4Id}-error`}
                role="alert"
                className="text-xs text-red-600 dark:text-red-300"
              >
                {errors.last4}
              </p>
            ) : null}
          </div>
          {errors.form ? (
            <p
              role="alert"
              className="text-[13px] text-red-600 dark:text-red-300"
            >
              {errors.form}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="fina-ghost"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="fina-primary" disabled={isSaving}>
              {isSaving ? "Saving..." : card ? "Save card" : "Add card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
