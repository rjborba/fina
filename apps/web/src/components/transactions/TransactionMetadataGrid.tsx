import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type {
  TransactionMetadataSlot,
  TransactionRowLayout
} from "./transactionRowLayout"

export function TransactionMetadataGrid({
  layout,
  description,
  cells
}: {
  layout: TransactionRowLayout
  description: ReactNode
  cells: Partial<Record<TransactionMetadataSlot, ReactNode>>
}) {
  return (
    <div
      className="transaction-metadata-grid grid w-full min-w-0 items-center gap-3 whitespace-nowrap"
      style={{ gridTemplateColumns: "var(--transaction-metadata-columns)" }}
    >
      <div
        data-metadata-slot="description"
        className="flex min-w-0 items-center gap-2"
      >
        {description}
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
              "min-w-0 items-center",
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
