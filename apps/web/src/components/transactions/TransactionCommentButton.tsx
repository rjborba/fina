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
import { TransactionConversation } from "./TransactionConversation"

export function TransactionCommentButton({
  transaction,
  disabled = false
}: {
  transaction: TransactionOutput
  disabled?: boolean
}) {
  const { t } = useTranslation()

  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const hasComments = transaction.commentCount > 0
  const unresolved = hasComments && !transaction.conversationResolved
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
          hasComments
            ? t("Open transaction conversation")
            : t("Add transaction comment")
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        title={
          hasComments
            ? t("commentsSummary", {
                count: transaction.commentCount,
                status: unresolved ? t("Unresolved") : t("Resolved")
              })
            : t("Add comment")
        }
        disabled={disabled}
        className={cn(
          "flex size-8 items-center justify-center rounded-md outline-none hover:bg-yellow-400/20 focus-visible:ring-2 focus-visible:ring-yellow-600 disabled:opacity-50",
          unresolved
            ? "text-yellow-800 dark:text-yellow-300"
            : "text-foreground/35 hover:text-yellow-700 dark:hover:text-yellow-300"
        )}
        onClick={() => setOpen(true)}
      >
        <MessageSquare
          aria-hidden="true"
          className="size-4"
          fill={hasComments ? "currentColor" : "none"}
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="transaction-scrollbar max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border-fina-grid bg-fina-surface text-foreground"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            trigger.current?.focus()
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{t("Transaction conversation")}</DialogTitle>
            <DialogDescription className="break-words">
              {transaction.description || t("Untitled transaction")}
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <TransactionConversation
              key={transaction.id}
              id={transaction.id}
              disabled={disabled}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
