import { useTranslation } from "react-i18next"
import { getLocale } from "@/i18n"
import { useRef, useState } from "react"
import { Check, RotateCcw, Send } from "lucide-react"
import { TransactionCommentBodySchema } from "@fina/types"
import { Button } from "@/components/ui/button"
import { useTransactionConversation } from "@/data/transactions/useTransactionConversation"

export function TransactionConversation({
  id,
  disabled = false
}: {
  id: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { query, add, resolve } = useTransactionConversation(id)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")
  const sending = useRef(false)
  const pending = add.isPending || resolve.isPending
  const conversation = query.data
  const send = async () => {
    if (sending.current || pending || disabled) return
    const parsed = TransactionCommentBodySchema.safeParse(draft)
    if (!parsed.success) {
      setError("Enter a comment of 1–4,000 characters.")
      return
    }
    sending.current = true
    setError("")
    try {
      await add.mutateAsync(parsed.data)
      setDraft("")
    } catch {
      setError("Could not send comment. Try again.")
    } finally {
      sending.current = false
    }
  }
  return (
    <div
      data-note-control
      data-transaction-conversation
      className="min-w-0 space-y-4"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {query.isPending ? (
        <p role="status" className="text-sm text-foreground/60">
          {t("Loading conversation…")}
        </p>
      ) : query.isError ? (
        <div role="alert" className="text-sm">
          {t("Could not load conversation.")}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void query.refetch()}
          >
            {t("Retry")}
          </Button>
        </div>
      ) : conversation ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              role="status"
              className={
                conversation.resolved
                  ? "text-xs text-foreground/60"
                  : "text-xs text-yellow-800 dark:text-yellow-300"
              }
            >
              {conversation.messages.length
                ? conversation.resolved
                  ? t("Resolved")
                  : t("Unresolved")
                : t("No comments yet")}
            </span>
            {conversation.messages.length ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled || pending}
                onClick={async () => {
                  setError("")
                  try {
                    await resolve.mutateAsync(!conversation.resolved)
                  } catch {
                    setError("Could not update conversation. Try again.")
                  }
                }}
              >
                {conversation.resolved ? (
                  <RotateCcw aria-hidden="true" className="mr-2 size-3.5" />
                ) : (
                  <Check aria-hidden="true" className="mr-2 size-3.5" />
                )}
                {conversation.resolved
                  ? t("Reopen conversation")
                  : t("Resolve conversation")}
              </Button>
            ) : null}
          </div>
          {conversation.messages.length ? (
            <ol
              aria-label={t("Conversation messages")}
              className="transaction-scrollbar max-h-[40vh] space-y-4 overflow-y-auto pr-2"
            >
              {conversation.messages.map((message) => (
                <li
                  key={message.id}
                  className="min-w-0 border-l-2 border-fina-grid pl-3"
                >
                  <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                    <span className="font-medium">
                      {message.author
                        ? message.author.name || t("Workspace member")
                        : t("Previous note · author unavailable")}
                    </span>
                    <time
                      dateTime={message.createdAt}
                      className="text-foreground/45"
                    >
                      {new Date(message.createdAt).toLocaleString(getLocale())}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm font-normal leading-relaxed [overflow-wrap:anywhere]">
                    {message.body}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
            className="space-y-2"
          >
            <textarea
              aria-label={
                conversation.messages.length
                  ? t("Reply to conversation")
                  : t("Comment")
              }
              aria-invalid={Boolean(error)}
              value={draft}
              disabled={disabled || pending}
              maxLength={4000}
              rows={3}
              placeholder={
                conversation.messages.length
                  ? t("Write a reply…")
                  : t("Start a conversation…")
              }
              className="w-full resize-y rounded-md border border-fina-grid bg-fina-canvas p-3 text-sm font-normal outline-none focus:ring-1 focus:ring-fina-violet"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  (event.ctrlKey || event.metaKey) &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault()
                  void send()
                }
              }}
            />
            {conversation.resolved ? (
              <p className="text-xs text-foreground/50">
                {t("Sending a reply reopens this conversation.")}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={disabled || pending || !draft.trim()}
              >
                <Send aria-hidden="true" className="mr-2 size-3.5" />
                {add.isPending
                  ? t("Sending…")
                  : conversation.messages.length
                    ? t("Send reply")
                    : t("Send comment")}
              </Button>
            </div>
          </form>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-red-700 dark:text-red-300">
          {t(error)}
        </p>
      ) : null}
    </div>
  )
}
