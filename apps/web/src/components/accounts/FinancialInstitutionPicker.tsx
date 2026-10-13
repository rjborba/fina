import { forwardRef, useState, type ComponentPropsWithoutRef } from "react"
import {
  FINANCIAL_INSTITUTIONS,
  type FinancialInstitutionId
} from "@fina/types"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
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
import { FinancialInstitutionLogo } from "./FinancialInstitutionLogo"

export const OTHER_INSTITUTION_LABEL = "Other / not listed"

interface FinancialInstitutionPickerProps
  extends Omit<ComponentPropsWithoutRef<"button">, "value" | "onChange"> {
  value: FinancialInstitutionId | null | undefined
  onChange: (institutionId: FinancialInstitutionId | null) => void
  accountType?: string
  ariaLabel?: string
}

/** Undefined asks for a choice; null is an explicit generic institution. */
export const FinancialInstitutionPicker = forwardRef<
  HTMLButtonElement,
  FinancialInstitutionPickerProps
>(function FinancialInstitutionPicker(
  {
    value,
    onChange,
    accountType,
    ariaLabel = "Financial institution",
    disabled,
    className,
    ...props
  },
  ref
) {
  const [open, setOpen] = useState(false)
  const institution = FINANCIAL_INSTITUTIONS.find((item) => item.id === value)
  const label =
    institution?.name ??
    (value === null
      ? OTHER_INSTITUTION_LABEL
      : accountType === "credit"
        ? "Choose a card issuer"
        : "Choose a financial institution")
  const choose = (id: FinancialInstitutionId | null) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          {...props}
          ref={ref}
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          variant="fina-secondary"
          className={cn(
            "h-11 w-full justify-between rounded-md border-fina-grid px-3 text-[13px] font-normal",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <FinancialInstitutionLogo
              institutionId={value ?? null}
              accountType={accountType}
              className="size-6 shrink-0"
              decorative
            />
            <span
              className={cn(
                "truncate",
                value === undefined && "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </span>
          <ChevronsUpDown
            className="size-3.5 shrink-0 opacity-50"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={16}
        aria-label={ariaLabel}
        className="w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[calc(100vw-2rem)] rounded-xl border-fina-grid bg-fina-surface p-0 shadow-fina-md"
      >
        <Command
          label="Search financial institutions"
          className="bg-transparent"
        >
          <CommandInput
            placeholder="Search institutions..."
            aria-label="Search financial institutions"
            disabled={disabled}
            className="h-10 text-[13px]"
          />
          <CommandList aria-label="Financial institutions" className="max-h-72">
            <CommandEmpty className="py-5 text-[13px]">
              No institutions found.
            </CommandEmpty>
            <CommandGroup>
              {FINANCIAL_INSTITUTIONS.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  keywords={[
                    item.id,
                    item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                  ]}
                  disabled={disabled}
                  onSelect={() => choose(item.id)}
                  className="h-9 gap-2 rounded-md text-[13px]"
                >
                  <FinancialInstitutionLogo
                    institutionId={item.id}
                    className="size-6 shrink-0"
                    decorative
                  />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {value === item.id ? (
                    <Check className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : null}
                </CommandItem>
              ))}
              <CommandItem
                value={OTHER_INSTITUTION_LABEL}
                keywords={["custom", "generic", "none"]}
                disabled={disabled}
                onSelect={() => choose(null)}
                className="h-9 gap-2 rounded-md text-[13px]"
              >
                <FinancialInstitutionLogo
                  institutionId={null}
                  accountType={accountType}
                  className="size-6 shrink-0"
                  decorative
                />
                <span className="min-w-0 flex-1 truncate">
                  {OTHER_INSTITUTION_LABEL}
                </span>
                {value === null ? (
                  <Check className="size-3.5 shrink-0" aria-hidden="true" />
                ) : null}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})
