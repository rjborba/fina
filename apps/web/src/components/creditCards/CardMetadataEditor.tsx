import { useId, useState } from "react"
import { CardMetadataSchema, type CardMetadata } from "@fina/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CardMetadataEditor({
  value,
  disabled = false,
  onSave
}: {
  value: CardMetadata
  disabled?: boolean
  onSave: (value: CardMetadata) => Promise<void>
}) {
  const id = useId()
  const [name, setName] = useState(value.cardName ?? "")
  const [last4, setLast4] = useState(value.cardLast4 ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    const parsed = CardMetadataSchema.safeParse({
      cardName: name.trim() || null,
      cardLast4: last4.trim() || null
    })
    if (!parsed.success) {
      setError(
        "Use a safe card name and exactly four final digits, or leave them blank."
      )
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(parsed.data)
    } catch {
      setError("Card details could not be saved. Try again.")
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="space-y-3 text-[13px] font-normal">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`}>Card name</Label>
        <Input
          id={`${id}-name`}
          value={name}
          maxLength={80}
          disabled={disabled || saving}
          placeholder="Not identified"
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-last4`}>Last four digits</Label>
        <Input
          id={`${id}-last4`}
          value={last4}
          inputMode="numeric"
          maxLength={4}
          disabled={disabled || saving}
          placeholder="Optional"
          onChange={(event) => setLast4(event.target.value)}
          aria-describedby={`${id}-hint`}
        />
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          Only the final four digits. Leave both fields blank for Not
          identified.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={disabled || saving}
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save card details"}
      </Button>
    </div>
  )
}
