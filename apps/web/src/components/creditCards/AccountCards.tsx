import { useState } from "react"
import type { CreditCardOutput } from "@fina/types"
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Archive
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useCreditCardsMutation } from "@/data/creditCards/useCreditCardsMutation"
import { cn } from "@/lib/utils"
import { CardDialog } from "./CardDialog"
import { CardLabel } from "./CardLabel"

export function AccountCards({
  accountId,
  accountName,
  groupId,
  cards,
  isLoading,
  isError
}: {
  accountId: string
  accountName: string
  groupId: string
  cards: readonly CreditCardOutput[]
  isLoading?: boolean
  isError?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [editor, setEditor] = useState<{ card?: CreditCardOutput } | null>(null)
  const [archiving, setArchiving] = useState<CreditCardOutput | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState(false)
  const { archiveMutation } = useCreditCardsMutation(groupId)
  const activeCount = cards.filter((card) => !card.archived).length
  const archivedCount = cards.length - activeCount
  const visibleCards = cards.filter((card) => showArchived || !card.archived)
  const archive = async () => {
    if (!archiving || isArchiving) return
    setIsArchiving(true)
    setArchiveError(false)
    try {
      await archiveMutation.mutateAsync(archiving.id)
      setArchiving(null)
    } catch {
      setArchiveError(true)
    } finally {
      setIsArchiving(false)
    }
  }
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mt-3 border-t border-fina-grid pt-2"
    >
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="fina-ghost"
            aria-label={`Cards for ${accountName}`}
            className="h-7 gap-1.5 px-1 text-xs font-normal"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-90"
              )}
              aria-hidden
            />
            Cards{" "}
            <span className="text-muted-foreground">
              {isLoading ? "..." : activeCount}
            </span>
          </Button>
        </CollapsibleTrigger>
        {open ? (
          <Button
            type="button"
            variant="fina-ghost"
            disabled={isLoading || isError}
            aria-label={`Add card to ${accountName}`}
            className="h-7 gap-1 px-2 text-xs font-normal"
            onClick={() => setEditor({})}
          >
            <Plus className="size-3.5" aria-hidden /> Add card
          </Button>
        ) : null}
      </div>
      <CollapsibleContent>
        <p className="mb-2 mt-1 px-1 text-xs text-muted-foreground">
          One shared bill and due day for all cards on this account.
        </p>
        {isLoading ? (
          <p role="status" className="p-2 text-xs text-muted-foreground">
            Loading cards...
          </p>
        ) : isError ? (
          <p
            role="alert"
            className="p-2 text-xs text-red-600 dark:text-red-300"
          >
            Could not load cards. Try again in a moment.
          </p>
        ) : visibleCards.length ? (
          <ul className="space-y-0.5" aria-label={`Cards on ${accountName}`}>
            {visibleCards.map((card) => (
              <li
                key={card.id}
                className="group/card flex h-8 min-w-0 items-center gap-2 rounded-md px-2 text-[13px] hover:bg-foreground/[0.035]"
              >
                <CardLabel card={card} className="min-w-0 flex-1" />
                {!card.archived ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="fina-ghost"
                        size="icon"
                        aria-label={`Actions for ${card.name}`}
                        className="size-6 shrink-0"
                      >
                        <MoreHorizontal className="size-3.5" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="rounded-lg border-fina-grid bg-fina-surface"
                    >
                      <DropdownMenuItem
                        onSelect={() => setEditor({ card })}
                        className="text-[13px]"
                      >
                        <Pencil className="size-3.5" /> Edit card
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          setArchiveError(false)
                          setArchiving(card)
                        }}
                        className="text-[13px]"
                      >
                        <Archive className="size-3.5" /> Archive card
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-3 text-[13px] text-muted-foreground">
            {cards.length
              ? "No active cards."
              : "No cards yet. Add a card to identify future purchases."}
          </p>
        )}
        {archivedCount > 0 ? (
          <Button
            type="button"
            variant="fina-ghost"
            aria-pressed={showArchived}
            className="mt-1 h-7 px-1 text-xs font-normal text-muted-foreground"
            onClick={() => setShowArchived((current) => !current)}
          >
            {showArchived
              ? "Hide archived"
              : `Show archived (${archivedCount})`}
          </Button>
        ) : null}
      </CollapsibleContent>
      {editor ? (
        <CardDialog
          accountId={accountId}
          accountName={accountName}
          groupId={groupId}
          card={editor.card}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditor(null)
          }}
        />
      ) : null}
      <AlertDialog
        open={!!archiving}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isArchiving) setArchiving(null)
        }}
      >
        <AlertDialogContent
          aria-busy={isArchiving}
          className="max-w-sm rounded-xl border-fina-grid bg-fina-surface p-5"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Archive {archiving?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              The card will be hidden from new purchases. Existing transaction
              links and the account's combined bill will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {archiveError ? (
            <p
              role="alert"
              className="text-[13px] text-red-600 dark:text-red-300"
            >
              Could not archive the card. Please try again.
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isArchiving}
              onClick={(event) => {
                event.preventDefault()
                void archive()
              }}
            >
              {isArchiving ? "Archiving..." : "Archive card"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  )
}
