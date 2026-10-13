import { useState } from "react"
import { Check, ChevronDown, CreditCard, Loader2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { CardLabel } from "./CardLabel"
import { formatCardLabel, type CardOption } from "./cardLabelFormat"

export function CardPicker({
  cards,
  value,
  onChange,
  selectedCard,
  isLoading = false,
  disabled = false,
  ariaLabel = "Card",
  className
}: {
  cards: readonly CardOption[]
  value: string | null
  onChange: (id: string | null) => void
  selectedCard?: CardOption | null
  isLoading?: boolean
  disabled?: boolean
  ariaLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = value
    ? (cards.find((card) => card.id === value) ??
      (selectedCard?.id === value ? selectedCard : undefined))
    : null
  const activeCards = cards.filter((card) => !card.archived)
  const select = (id: string | null) => {
    onChange(id)
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
          disabled={disabled || isLoading}
          variant="fina-secondary"
          className={cn(
            "h-9 w-full justify-between text-[13px] font-normal",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <CreditCard className="size-3.5 opacity-60" aria-hidden />
            )}
            {selected ? (
              <CardLabel card={selected} />
            ) : value ? (
              "Card unavailable"
            ) : (
              "Not identified"
            )}
          </span>
          <ChevronDown className="size-3.5 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={ariaLabel}
        align="start"
        className="w-72 rounded-xl border-fina-grid bg-fina-surface p-0 shadow-fina-md"
      >
        <Command label="Search cards" className="bg-transparent">
          <CommandInput
            aria-label="Search cards"
            placeholder="Search cards..."
            className="h-9 text-[13px]"
          />
          <CommandList aria-label="Cards">
            <CommandEmpty className="py-4 text-[13px]">
              No matching cards.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Not identified"
                onSelect={() => select(null)}
                className="h-8 text-[13px]"
              >
                <CreditCard className="size-3.5 opacity-50" aria-hidden />
                Not identified
                {!value ? (
                  <Check className="ml-auto size-3.5" aria-hidden />
                ) : null}
              </CommandItem>
              {selected?.archived ? (
                <CommandItem
                  value={`archived-${selected.id}`}
                  disabled
                  className="h-8 text-[13px]"
                >
                  <CardLabel card={selected} />
                  <Check className="ml-auto size-3.5" aria-hidden />
                </CommandItem>
              ) : null}
              {activeCards.map((card) => (
                <CommandItem
                  key={card.id}
                  value={card.id}
                  keywords={[card.name, card.last4 ?? ""]}
                  onSelect={() => select(card.id)}
                  className="h-8 text-[13px]"
                >
                  <span
                    className="min-w-0 truncate"
                    title={formatCardLabel(card)}
                  >
                    {formatCardLabel(card)}
                  </span>
                  {card.id === value ? (
                    <Check className="ml-auto size-3.5" aria-hidden />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
