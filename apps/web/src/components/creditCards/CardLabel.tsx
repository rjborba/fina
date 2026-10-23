import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { formatCardLabel, type CardOption } from "./cardLabelFormat"

export function CardLabel({
  card,
  className,
  showLast4 = true
}: {
  card: CardOption | null | undefined
  className?: string
  showLast4?: boolean
}) {
  const { t } = useTranslation()

  const label = showLast4
    ? formatCardLabel(card)
    : card?.cardName || (card?.cardLast4 ? "" : t("Not identified"))
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <span className="truncate" title={label}>
        {label}
      </span>
    </span>
  )
}
