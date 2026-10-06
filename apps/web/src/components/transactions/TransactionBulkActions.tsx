import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Trash } from "lucide-react"

interface TransactionBulkActionsProps {
  selectedCount: number
  allSelected: boolean
  isDeleting: boolean
  onSelectAll: () => void
  onClearSelection: () => void
  onDelete: () => Promise<void>
}

export function TransactionBulkActions({
  selectedCount,
  allSelected,
  isDeleting,
  onSelectAll,
  onClearSelection,
  onDelete
}: TransactionBulkActionsProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 border-2 border-fina-ink bg-fina-surface p-2 shadow-fina-lg"
    >
      <span className="px-2 font-mono text-xs font-black uppercase">
        {selectedCount} selected
      </span>
      <Button
        type="button"
        variant="fina-secondary"
        size="sm"
        disabled={allSelected || isDeleting}
        onClick={onSelectAll}
      >
        Select all
      </Button>
      <Button
        type="button"
        variant="fina-ghost"
        size="sm"
        disabled={isDeleting}
        onClick={onClearSelection}
      >
        Unselect all
      </Button>
      <ConfirmationDialog
        trigger={
          <Button
            type="button"
            variant="fina-danger"
            size="sm"
            disabled={isDeleting}
          >
            <Trash className="size-3.5" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        }
        title={`Delete ${selectedCount} transaction${selectedCount === 1 ? "" : "s"}?`}
        description="This removes every selected transaction. This action cannot be undone."
        confirmText="Delete selected"
        onConfirm={onDelete}
      />
    </div>
  )
}
