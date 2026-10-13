import { useState } from "react"
import { ChevronDown, CreditCard } from "lucide-react"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCreditCards } from "@/data/creditCards/useCreditCards"
import { CardLabel } from "@/components/creditCards/CardLabel"
import { formatCardLabel } from "@/components/creditCards/cardLabelFormat"
import type { CreditCardReference } from "@fina/types"
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

export function BulkCardAssignment({
  accountId,
  busy,
  onAssignCard
}: {
  accountId: string | null
  busy: boolean
  onAssignCard: (card: CreditCardReference | null) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const { selectedGroup } = useActiveGroup()
  const query = useCreditCards({
    groupId: accountId ? selectedGroup?.id : undefined,
    accountId: accountId ?? undefined
  })
  const disabled =
    busy || assigning || !accountId || query.isLoading || query.isError
  const assign = async (card: CreditCardReference | null) => {
    if (disabled) return
    setAssigning(true)
    try {
      await onAssignCard(card)
      setOpen(false)
    } catch {
      // The ledger reports partial failures; retain this editor for retry.
    } finally {
      setAssigning(false)
    }
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!busy && !assigning) setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="fina-ghost"
          size="sm"
          aria-label="Card for selected purchases"
          disabled={disabled}
          title={
            !accountId
              ? "Select credit purchases from one account to assign their card"
              : query.isError
                ? "Could not load cards"
                : "All selected purchases retain one shared account bill"
          }
          className="h-7 rounded-md border-0 bg-transparent px-2 text-[13px] font-normal shadow-none hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
        >
          <CreditCard className="size-3.5" aria-hidden />{" "}
          {assigning ? "Updating..." : "Card"}{" "}
          <ChevronDown className="size-3" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        aria-label="Card for selected purchases"
        className="w-64 rounded-xl border-fina-grid bg-fina-surface p-0 shadow-fina-md"
      >
        <Command label="Search cards" className="bg-transparent">
          <CommandInput
            placeholder="Search cards..."
            disabled={busy || assigning}
          />
          <CommandList>
            <CommandEmpty>No matching cards.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Not identified"
                disabled={busy || assigning}
                onSelect={() => void assign(null)}
              >
                Not identified
              </CommandItem>
              {(query.data ?? []).map((card) => (
                <CommandItem
                  key={card.id}
                  value={`${card.id} ${formatCardLabel(card)}`}
                  disabled={busy || assigning}
                  onSelect={() => void assign(card)}
                >
                  <CardLabel card={card} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
