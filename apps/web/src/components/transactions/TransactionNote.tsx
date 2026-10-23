import { useTranslation } from "react-i18next"
import { useRef, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TransactionNote({
  value,
  onSave,
  disabled = false,
  startEditing = false,
  onDone
}: {
  value: string | null
  onSave: (note: string | null) => Promise<unknown>
  disabled?: boolean
  startEditing?: boolean
  onDone?: () => void
}) {
  const { t } = useTranslation()

  const [editing, setEditing] = useState(startEditing)
  const [draft, setDraft] = useState(value ?? "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const saving = useRef(false)
  const finish = () => {
    setEditing(false)
    onDone?.()
  }
  const save = async (note: string | null = draft.trim() || null) => {
    if (saving.current || disabled) return
    if (note === value || (!note && !value)) {
      finish()
      return
    }
    saving.current = true
    setPending(true)
    setError("")
    try {
      await onSave(note)
      finish()
    } catch {
      setError("Could not save note. Try again.")
    } finally {
      saving.current = false
      setPending(false)
    }
  }
  return (
    <div
      data-note-control
      data-note-editor={editing || undefined}
      data-transaction-note
      className="min-w-0"
      onClick={(event) => event.stopPropagation()}
    >
      {editing ? (
        <>
          <textarea
            aria-label={t("Transaction note")}
            aria-invalid={Boolean(error)}
            value={draft}
            disabled={disabled || pending}
            autoFocus
            rows={4}
            className="w-full resize-y rounded-md border border-fina-grid bg-fina-canvas p-3 text-sm font-normal outline-none focus:ring-1 focus:ring-fina-violet"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === "Escape" && !pending) {
                event.preventDefault()
                finish()
              }
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                void save()
              }
            }}
          />
          {error ? (
            <p role="alert" className="text-xs text-red-700 dark:text-red-300">
              {t(error)}
            </p>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            {value?.trim() ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={t("Remove comment")}
                title={t("Remove comment")}
                className="mr-auto text-red-700 hover:bg-red-500/10 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
                disabled={disabled || pending}
                onClick={() => void save(null)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={finish}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled || pending}
              onClick={() => void save()}
            >
              {pending ? t("Saving…") : t("Save note")}
            </Button>
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={disabled}
          aria-label={value ? t("Edit note") : t("Add note")}
          className="flex min-h-10 w-full min-w-0 items-start gap-2 rounded py-2 text-left text-sm font-normal text-foreground/65 outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-fina-violet disabled:opacity-50"
          onClick={() => {
            setDraft(value ?? "")
            setError("")
            setEditing(true)
          }}
        >
          <Pencil aria-hidden="true" className="mt-1 size-3 shrink-0" />
          <span className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {value || t("Add note")}
          </span>
        </button>
      )}
    </div>
  )
}
