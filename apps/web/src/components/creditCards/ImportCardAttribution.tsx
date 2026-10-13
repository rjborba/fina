import type { ImportMappingConfig } from "@fina/types"
import { Link } from "react-router"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CardPicker } from "./CardPicker"
import { formatCardLabel, type CardOption } from "./cardLabelFormat"

type CardMapping = NonNullable<
  ImportMappingConfig["creditCardMappings"]
>[number]

export function ImportCardAttribution({
  cards,
  isLoading,
  isError,
  onRetry,
  disabled,
  fallbackCardId,
  onFallbackChange,
  column,
  columns,
  onColumnChange,
  identifiers,
  mappings,
  onMappingChange
}: {
  cards: readonly CardOption[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  disabled: boolean
  fallbackCardId: string | null
  onFallbackChange: (id: string | null) => void
  column: number | null
  columns: readonly [string, string][]
  onColumnChange: (column: number | null) => void
  identifiers: readonly { value: string; count: number }[]
  mappings: readonly CardMapping[]
  onMappingChange: (value: string, id: string | null) => void
}) {
  const activeCards = cards.filter((card) => !card.archived)
  const mappedValues = new Map(
    mappings.map((mapping) => [mapping.value, mapping])
  )
  const fallbackUnavailable =
    fallbackCardId !== null &&
    !isLoading &&
    !activeCards.some((card) => card.id === fallbackCardId)
  const unavailableMapping =
    !isLoading &&
    mappings.some(
      ({ creditCardId }) =>
        creditCardId !== null &&
        !activeCards.some((card) => card.id === creditCardId)
    )

  return (
    <section
      aria-label="Card attribution"
      className="space-y-4 rounded-lg border border-fina-grid p-4"
    >
      <div>
        <h3 className="text-sm font-medium">
          Identify cards in this statement
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          All cards in this account share one bill. Choose a card for the file,
          or map the card identifiers supplied by your CSV. Names and last four
          digits are never matched automatically.
        </p>
      </div>
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium">Card for this file</p>
          <CardPicker
            cards={cards}
            value={fallbackCardId}
            onChange={onFallbackChange}
            ariaLabel="Card for this file"
            isLoading={isLoading}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Applies when no card column is mapped, or a row&apos;s card value is
            blank. Choose Not identified if the export does not say which card
            was used.
          </p>
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="import-card-column"
            className="text-[13px] font-medium"
          >
            Card source column
          </label>
          <Select
            value={column?.toString() ?? "none"}
            onValueChange={(value) =>
              onColumnChange(value === "none" ? null : Number(value))
            }
            disabled={disabled}
          >
            <SelectTrigger id="import-card-column" className="h-9 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No card column</SelectItem>
              {columns.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isError ? (
        <div
          role="alert"
          className="flex items-center gap-2 text-[13px] text-destructive"
        >
          Cards could not be loaded.
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={onRetry}
          >
            Retry cards
          </Button>
        </div>
      ) : null}
      {fallbackUnavailable ? (
        <p role="alert" className="text-[13px] text-destructive">
          The file card is archived or unavailable. Choose another card or Not
          identified.
        </p>
      ) : null}
      {unavailableMapping ? (
        <p role="alert" className="text-[13px] text-destructive">
          A saved card mapping is archived or unavailable. Remap it or choose
          Not identified, including saved values not present in this file.
        </p>
      ) : null}
      {column !== null && identifiers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[13px] text-muted-foreground">
            Assign every source value, including values you want to mark as Not
            identified. Blank values use the file card above.
          </p>
          <div className="space-y-2">
            {identifiers.map(({ value, count }) => {
              const mapping = mappedValues.get(value)
              const selected = mapping?.creditCardId
                ? cards.find((card) => card.id === mapping.creditCardId)
                : null
              const unavailableCardId =
                mapping?.creditCardId && (!selected || selected.archived)
                  ? mapping.creditCardId
                  : null
              return (
                <div
                  key={value}
                  className="grid items-center gap-2 rounded-md bg-foreground/[0.025] p-2 sm:grid-cols-[minmax(0,1fr)_minmax(180px,1fr)]"
                >
                  <div className="min-w-0 text-[13px]">
                    <span className="break-words font-medium">{value}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {count} {count === 1 ? "row" : "rows"}
                      {count === 0 ? " (saved mapping; not in this file)" : ""}
                    </span>
                  </div>
                  <Select
                    value={
                      mapping ? (mapping.creditCardId ?? "unassigned") : ""
                    }
                    onValueChange={(id) =>
                      onMappingChange(value, id === "unassigned" ? null : id)
                    }
                    disabled={disabled || isLoading}
                  >
                    <SelectTrigger
                      aria-label={`Card for source ${value}`}
                      aria-invalid={!mapping || !!unavailableCardId}
                      className="h-9 text-[13px]"
                    >
                      <SelectValue placeholder="Choose a card..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Not identified</SelectItem>
                      {unavailableCardId ? (
                        <SelectItem value={unavailableCardId} disabled>
                          {selected
                            ? `${formatCardLabel(selected)} (Archived)`
                            : "Card unavailable"}
                        </SelectItem>
                      ) : null}
                      {activeCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {formatCardLabel(card)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
      <Link
        to="/bank-accounts"
        className="text-xs text-muted-foreground underline underline-offset-2"
      >
        Manage this account&apos;s cards
      </Link>
    </section>
  )
}
