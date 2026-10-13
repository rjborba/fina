import { cn } from "@/lib/utils"
import { formatCardLabel, type CardOption } from "./cardLabelFormat"

export function CardLabel({
  card,
  className,
  showArchived = true
}: {
  card: CardOption | null | undefined
  className?: string
  showArchived?: boolean
}) {
  const label = formatCardLabel(card)
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <span className="truncate" title={label}>
        {label}
      </span>
      {showArchived && card?.archived ? (
        <span className="shrink-0 rounded bg-foreground/5 px-1 py-0.5 text-[10px] text-muted-foreground">
          Archived
        </span>
      ) : null}
    </span>
  )
}
