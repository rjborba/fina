import { useTranslation } from "react-i18next"
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  SlidersHorizontal
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  TRANSACTION_DISPLAY_PROPERTIES,
  type TransactionDisplayProperties
} from "./transactionDisplay"
import {
  TRANSACTION_SORT_OPTIONS,
  type TransactionSortOption
} from "./transactionSort"

interface TransactionsSortProps {
  value: TransactionSortOption
  onValueChange: (value: TransactionSortOption) => void
  options?: typeof TRANSACTION_SORT_OPTIONS
  open?: boolean
  onOpenChange?: (open: boolean) => void
  displayProperties?: TransactionDisplayProperties
  onDisplayPropertiesChange?: (value: TransactionDisplayProperties) => void
  inlineCreditCardTransactions?: boolean
  onInlineCreditCardTransactionsChange?: (value: boolean) => void
}

const sortFields = [
  { value: "date", label: "Date" },
  { value: "value", label: "Amount" },
  { value: "description", label: "Description" },
  { value: "category", label: "Category" }
] as const

export function TransactionsSort({
  value,
  onValueChange,
  options = TRANSACTION_SORT_OPTIONS,
  open,
  onOpenChange,
  displayProperties,
  onDisplayPropertiesChange,
  inlineCreditCardTransactions,
  onInlineCreditCardTransactionsChange
}: TransactionsSortProps) {
  const { t } = useTranslation()

  const direction = value.endsWith("-desc") ? "desc" : "asc"
  const field = value.replace(/-(asc|desc)$/, "")
  const orderingLabel = t(
    options.find((option) => option.value === value)?.label ??
      "Date — newest first"
  )
  const DirectionIcon =
    direction === "desc" ? ArrowDownWideNarrow : ArrowUpNarrowWide

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 gap-1.5 rounded-md border border-fina-grid px-3 text-xs font-normal text-muted-foreground hover:bg-fina-canvas hover:text-foreground focus-visible:border-foreground/30 focus-visible:bg-fina-canvas focus-visible:ring-0 data-[state=open]:bg-fina-canvas data-[state=open]:text-foreground md:h-7 md:px-2"
          aria-label={t("Display options")}
          title={t("Display options{{value0}} · {{value1}}", {
            value0: onOpenChange ? " (Shift V)" : "",
            value1: orderingLabel
          })}
          aria-keyshortcuts={onOpenChange ? "Shift+V" : undefined}
        >
          <SlidersHorizontal className="size-3.5" />
          <span>{t("Display")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label={t("Display options")}
        className="fina-scrollbar max-h-[var(--radix-popover-content-available-height)] w-[304px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-xl border border-fina-grid bg-fina-surface p-0 text-xs text-foreground shadow-fina-md"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-muted-foreground">{t("Ordering")}</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:bg-fina-canvas hover:text-foreground focus-visible:border-transparent focus-visible:bg-fina-canvas focus-visible:text-foreground focus-visible:ring-0"
              aria-label={
                direction === "desc"
                  ? t("Sort ascending")
                  : t("Sort descending")
              }
              title={orderingLabel}
              onClick={() => {
                const nextDirection = direction === "desc" ? "asc" : "desc"
                const nextOption = options.find(
                  (option) => option.value === `${field}-${nextDirection}`
                )
                if (nextOption) onValueChange(nextOption.value)
              }}
            >
              <DirectionIcon className="size-3.5" aria-hidden="true" />
            </Button>
            <Select
              value={field}
              onValueChange={(nextField) => {
                const nextOption =
                  options.find(
                    (option) => option.value === `${nextField}-${direction}`
                  ) ??
                  options.find((option) =>
                    option.value.startsWith(`${nextField}-`)
                  )
                if (nextOption) onValueChange(nextOption.value)
              }}
            >
              <SelectTrigger
                aria-label={t("Ordering")}
                className="h-7 w-32 rounded-md border-fina-grid bg-fina-canvas px-2 py-0 text-xs shadow-none focus:ring-0 focus-visible:border-foreground/30"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                align="end"
                className="border-fina-grid bg-fina-surface text-foreground"
              >
                {sortFields
                  .filter((sortField) =>
                    options.some((option) =>
                      option.value.startsWith(`${sortField.value}-`)
                    )
                  )
                  .map((sortField) => (
                    <SelectItem
                      key={sortField.value}
                      value={sortField.value}
                      className="text-xs focus:bg-fina-canvas focus:text-foreground"
                    >
                      {t(sortField.label)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {onInlineCreditCardTransactionsChange ||
        (displayProperties && onDisplayPropertiesChange) ? (
          <div className="space-y-3 border-t border-fina-grid px-4 py-3">
            <p className="font-medium">{t("List options")}</p>
            {onInlineCreditCardTransactionsChange ? (
              <label className="flex cursor-pointer items-center justify-between gap-3 text-muted-foreground">
                <span>{t("Inline credit card transactions")}</span>
                <Switch
                  aria-label={t("Inline credit card transactions")}
                  className="focus-visible:border-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                  checked={inlineCreditCardTransactions}
                  onCheckedChange={onInlineCreditCardTransactionsChange}
                />
              </label>
            ) : null}
            {displayProperties && onDisplayPropertiesChange ? (
              <div
                className="space-y-2"
                role="group"
                aria-label={t("Display properties")}
              >
                <p className="text-muted-foreground">
                  {t("Display properties")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("Import and card indicators always stay visible.")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {TRANSACTION_DISPLAY_PROPERTIES.map((property) => (
                    <button
                      key={property.id}
                      type="button"
                      aria-pressed={displayProperties[property.id]}
                      className={cn(
                        "h-6 rounded-full border px-2 text-xs transition-colors outline-none focus-visible:border-foreground/40",
                        displayProperties[property.id]
                          ? "border-foreground/10 bg-foreground/10 text-foreground hover:bg-foreground/15"
                          : "border-fina-grid bg-fina-canvas text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() =>
                        onDisplayPropertiesChange({
                          ...displayProperties,
                          [property.id]: !displayProperties[property.id]
                        })
                      }
                    >
                      {t(property.label)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
