import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type {
  TransactionMetadataSlot,
  TransactionRowLayout
} from "./transactionRowLayout"

const INLINE_ICON_ORDER = ["import", "card-icon"] as const

export function TransactionMetadataGrid({
  layout,
  description,
  descriptionContext,
  icons,
  cells
}: {
  layout: TransactionRowLayout
  description: ReactNode
  descriptionContext?: ReactNode
  icons: Partial<Record<(typeof INLINE_ICON_ORDER)[number], ReactNode>>
  cells: Partial<Record<TransactionMetadataSlot, ReactNode>>
}) {
  return (
    <div
      className="transaction-metadata-grid grid w-full min-w-0 items-center gap-2 whitespace-nowrap"
      style={{ gridTemplateColumns: "var(--transaction-metadata-columns)" }}
    >
      <div
        data-metadata-slot="description"
        className="flex min-w-0 items-center gap-1.5"
      >
        {description}
        {INLINE_ICON_ORDER.some((id) => icons[id]) ? (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            {INLINE_ICON_ORDER.map((id) =>
              icons[id] ? (
                <span
                  key={id}
                  data-inline-metadata={id}
                  className="inline-flex"
                >
                  {icons[id]}
                </span>
              ) : null
            )}
          </span>
        ) : null}
        {descriptionContext}
      </div>
      {layout.slots.map(({ id, desktopOnly }) => {
        const content = cells[id]
        const empty = content == null || content === false
        return (
          <div
            key={id}
            data-metadata-slot={id}
            data-empty={empty || undefined}
            aria-hidden={empty || undefined}
            className={cn(
              "min-w-0 items-center justify-end text-right",
              desktopOnly ? "hidden xl:flex" : "flex"
            )}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}
