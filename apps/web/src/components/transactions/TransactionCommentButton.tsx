import { useTranslation } from "react-i18next"
import { useRef, useState } from "react"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TransactionOutput } from "@fina/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { TransactionNote } from "./TransactionNote"
import type { UpdateLedgerTransaction } from "./TransactionLedgerTransaction"

export function TransactionCommentButton({
  transaction,
  onUpdateTransaction,
  disabled = false
}: {
  transaction: TransactionOutput
  onUpdateTransaction: UpdateLedgerTransaction
  disabled?: boolean
}) {
  const { t } = useTranslation()

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const hasNote = Boolean(transaction.observation?.trim())
  return (
    <div
      data-column="comment"
      className="flex h-full items-center justify-center"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={
          hasNote ? t("Edit transaction note") : t("Add transaction note")
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        title={hasNote ? undefined : t("Add note")}
        disabled={disabled}
        className={cn(
          "flex size-8 items-center justify-center rounded-md outline-none hover:bg-yellow-400/20 focus-visible:ring-2 focus-visible:ring-yellow-600 disabled:opacity-50",
          hasNote
            ? "text-yellow-800 dark:text-yellow-300"
            : "text-foreground/35 hover:text-yellow-700 dark:hover:text-yellow-300"
        )}
        onClick={() => setOpen(true)}
      >
        <MessageSquare
          aria-hidden="true"
          className="size-4"
          fill={hasNote ? "currentColor" : "none"}
        />
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!saving) setOpen(next)
        }}
      >
        <DialogContent
          className="w-[calc(100vw-2rem)] rounded-lg border-fina-grid bg-fina-surface text-foreground"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            trigger.current?.focus()
          }}
          onKeyDown={(event) => event.stopPropagation()}
          onEscapeKeyDown={(event) => {
            if (saving) event.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("Transaction note")}</DialogTitle>
            <DialogDescription className="break-words">
              {transaction.description || t("Untitled transaction")}
            </DialogDescription>
          </DialogHeader>
          <TransactionNote
            key={transaction.id}
            value={transaction.observation}
            startEditing
            disabled={disabled}
            onDone={() => setOpen(false)}
            onSave={async (observation) => {
              setSaving(true)
              try {
                await onUpdateTransaction(transaction.id, { observation })
              } finally {
                setSaving(false)
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
