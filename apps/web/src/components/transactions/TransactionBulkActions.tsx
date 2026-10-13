import { useState } from "react"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { ChevronDown, ListChecks, Tag, Trash } from "lucide-react"
import type { TransactionCategoryOption } from "./TransactionLedgerTransaction"
import { BulkCardAssignment } from "./BulkCardAssignment"
import type { CreditCardReference } from "@fina/types"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
})

const actionClass =
  "h-7 rounded-md border-0 bg-transparent px-2 text-[13px] font-normal shadow-none hover:bg-black/[0.05] focus-visible:ring-1 dark:hover:bg-white/[0.05]"

interface TransactionBulkActionsProps {
  selectedCount: number
  selectableCount: number
  selectedTotal: number
  unavailableValueCount: number
  categories: TransactionCategoryOption[]
  allSelected: boolean
  isDeleting: boolean
  isUpdatingCategory: boolean
  onSelectAll: () => void
  onClearSelection: () => void
  onDelete: () => Promise<void>
  onAssignCategory: (categoryId: string | null) => Promise<void>
  cardAccountId?: string | null
  isUpdatingCard?: boolean
  onAssignCard?: (card: CreditCardReference | null) => Promise<void>
}

export function TransactionBulkActions({
  selectedCount,
  selectableCount,
  selectedTotal,
  unavailableValueCount,
  categories,
  allSelected,
  isDeleting,
  isUpdatingCategory,
  onSelectAll,
  onClearSelection,
  onDelete,
  onAssignCategory,
  cardAccountId,
  isUpdatingCard = false,
  onAssignCard
}: TransactionBulkActionsProps) {
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const busy =
    isDeleting ||
    isUpdatingCategory ||
    isUpdatingCard ||
    isAssigning ||
    isConfirmingDelete

  const assignCategory = async (categoryId: string | null) => {
    if (busy) return
    setIsAssigning(true)
    try {
      await onAssignCategory(categoryId)
      setCategoryOpen(false)
    } catch {
      // The caller reports the error; keep the selection and editor available.
    } finally {
      setIsAssigning(false)
    }
  }

  const deleteSelection = async () => {
    if (busy) return
    setIsConfirmingDelete(true)
    try {
      await onDelete()
      setDeleteOpen(false)
    } catch {
      // The caller reports the error; leave confirmation available for retry.
    } finally {
      setIsConfirmingDelete(false)
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Selected transaction actions"
      aria-busy={busy}
      className="fixed bottom-5 left-1/2 z-40 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-xl border border-[#dedee3] bg-[#fcfcfd] p-2 text-[13px] text-[#303036] shadow-[0_4px_8px_-2px_rgba(0,0,0,0.08),0_8px_24px_-4px_rgba(0,0,0,0.12)] sm:rounded-full sm:py-[7px] md:group-has-[[data-slot=sidebar][data-state=expanded]]/sidebar-wrapper:left-[calc(50%+var(--sidebar-width)/2)] md:group-has-[[data-slot=sidebar][data-state=expanded]]/sidebar-wrapper:max-w-[calc(100vw-var(--sidebar-width)-2rem)] md:group-has-[[data-slot=sidebar][data-collapsible=icon]]/sidebar-wrapper:left-[calc(50%+var(--sidebar-width-icon)/2)] md:group-has-[[data-slot=sidebar][data-collapsible=icon]]/sidebar-wrapper:max-w-[calc(100vw-var(--sidebar-width-icon)-2rem)] dark:border-white/[0.12] dark:bg-[#1a1a1c] dark:text-[#e3e3e8] dark:shadow-[0_4px_8px_-2px_rgba(0,0,0,0.35),0_8px_24px_-4px_rgba(0,0,0,0.4)]"
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-2 py-1"
      >
        <ListChecks
          className="size-3.5 shrink-0 opacity-65"
          aria-hidden="true"
        />
        <span className="text-xs font-medium">{selectedCount} selected</span>
        <span className="tabular-nums text-[#71717c] dark:text-[#a0a0aa]">
          Net {currencyFormatter.format(selectedTotal)}
        </span>
        {unavailableValueCount > 0 ? (
          <span className="text-xs text-[#71717c] dark:text-[#a0a0aa]">
            {unavailableValueCount} without an amount
          </span>
        ) : null}
      </div>
      <span className="mx-1 hidden h-4 w-px bg-black/[0.08] dark:bg-white/[0.12] sm:block" />
      <Button
        type="button"
        variant="fina-ghost"
        size="sm"
        className={actionClass}
        title={`Select all ${selectableCount} loaded transactions in this view`}
        disabled={allSelected || busy}
        onClick={onSelectAll}
      >
        Select all
      </Button>
      <Button
        type="button"
        variant="fina-ghost"
        size="sm"
        className={actionClass}
        disabled={busy}
        onClick={onClearSelection}
      >
        Unselect all
      </Button>
      <span className="mx-1 hidden h-4 w-px bg-black/[0.08] dark:bg-white/[0.12] sm:block" />
      <Popover
        open={categoryOpen}
        onOpenChange={(open) => {
          if (!busy) setCategoryOpen(open)
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            aria-label="Category for selected transactions"
            variant="fina-ghost"
            size="sm"
            className={actionClass}
            disabled={busy}
          >
            <Tag className="size-3.5" aria-hidden="true" />
            {isUpdatingCategory || isAssigning ? "Updating..." : "Category"}
            <ChevronDown className="size-3" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          aria-label="Category for selected transactions"
          className="w-64 rounded-xl border-[#dedee3] bg-[#fcfcfd] p-0 shadow-fina-md dark:border-white/[0.12] dark:bg-[#202023]"
        >
          <Command
            label="Search categories"
            className="bg-transparent text-[13px]"
          >
            <CommandInput
              aria-label="Search categories"
              placeholder="Search categories..."
              disabled={busy}
              className="h-9 text-[13px]"
            />
            <CommandList aria-label="Categories" className="max-h-64">
              <CommandEmpty className="py-4 text-[13px]">
                No categories found.
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="None Uncategorized"
                  disabled={busy}
                  onSelect={() => void assignCategory(null)}
                  className="h-8 text-[13px] data-[selected=true]:bg-black/[0.05] dark:data-[selected=true]:bg-white/[0.05]"
                >
                  <Tag className="size-3.5 opacity-60" aria-hidden="true" />
                  None
                </CommandItem>
                {categories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={`${category.id} ${category.name}`}
                    disabled={busy}
                    onSelect={() => void assignCategory(category.id)}
                    className="h-8 text-[13px] data-[selected=true]:bg-black/[0.05] dark:data-[selected=true]:bg-white/[0.05]"
                  >
                    <CategoryAppearance
                      icon={category.icon}
                      color={category.color}
                      className="size-4 border-0 bg-transparent"
                    />
                    <span className="truncate">{category.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {onAssignCard ? (
        <BulkCardAssignment
          accountId={cardAccountId ?? null}
          busy={busy}
          onAssignCard={onAssignCard}
        />
      ) : null}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!busy) setDeleteOpen(open)
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="fina-ghost"
            size="sm"
            className={`${actionClass} text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200`}
            disabled={busy}
          >
            <Trash className="size-3.5" aria-hidden="true" />
            {isDeleting || isConfirmingDelete ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-xl border-fina-grid bg-fina-surface shadow-fina-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} transaction{selectedCount === 1 ? "" : "s"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Selected transactions will be removed from the ledger. Original
              import files are retained; this does not permanently delete the
              records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="border border-red-200 bg-fina-surface text-red-600 hover:bg-fina-danger dark:border-red-900/60 dark:text-red-300"
              onClick={(event) => {
                event.preventDefault()
                void deleteSelection()
              }}
            >
              {isDeleting || isConfirmingDelete
                ? "Deleting..."
                : "Delete selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
