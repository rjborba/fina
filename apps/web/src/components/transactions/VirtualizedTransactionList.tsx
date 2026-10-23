import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import {
  memo,
  useId,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode
} from "react"
import type { TransactionDisplayProperties } from "./transactionDisplay"
import {
  TRANSACTION_DATE_WIDTH,
  type TransactionRowLayout
} from "./transactionRowLayout"

export const TRANSACTION_LIST_ROW_HEIGHT = 40
export const TRANSACTION_LIST_OVERSCAN = 30
export const TRANSACTION_LIST_BOTTOM_PADDING = 48

interface VirtualizedTransactionListProps {
  rowCount: number
  totalSize: number
  displayProperties: TransactionDisplayProperties
  layout: TransactionRowLayout
  children: ReactNode
}

/** A one-column accessibility grid of interactive items, not an HTML table. */
export function VirtualizedTransactionList({
  rowCount,
  totalSize,
  displayProperties,
  layout,
  children
}: VirtualizedTransactionListProps) {
  const instructionsId = useId()
  const style: CSSProperties & { "--transaction-list-columns": string } = {
    height: totalSize + TRANSACTION_LIST_BOTTOM_PADDING,
    minWidth: `calc(${layout.minWidth}px + var(--transaction-responsive-space))`,
    "--transaction-list-columns": [
      "32px",
      displayProperties.date ? `${TRANSACTION_DATE_WIDTH}px` : null,
      "minmax(0, 1fr)",
      displayProperties.value ? "132px" : null
    ]
      .filter(Boolean)
      .join(" ")
  }
  const sizingStyle: CSSProperties & {
    "--transaction-desktop-space": string
    "--transaction-metadata-base-columns": string
    "--transaction-metadata-desktop-columns": string
  } = {
    minWidth: `calc(${layout.minWidth + 16}px + var(--transaction-responsive-space))`,
    "--transaction-desktop-space": `${layout.desktopExtraWidth}px`,
    "--transaction-metadata-base-columns": layout.columns,
    "--transaction-metadata-desktop-columns": layout.desktopColumns
  }

  return (
    <>
      <p id={instructionsId} className="sr-only">
        Use up and down arrows or J and K to navigate. Enter or Space opens the
        focused item. X selects a transaction; Shift and an arrow extends
        selection. Command or Control A selects all transactions. Escape clears
        selection. Bills open their details and cannot be selected. Tab reaches
        the item's controls. Use the row checkbox to select multiple
        transactions; Shift-click selects a range.
      </p>
      {/* A real outer box keeps the trailing gutter in horizontal overflow. */}
      <div
        className="[--transaction-responsive-space:0px] [--transaction-metadata-columns:var(--transaction-metadata-base-columns)] xl:[--transaction-responsive-space:var(--transaction-desktop-space)] xl:[--transaction-metadata-columns:var(--transaction-metadata-desktop-columns)]"
        style={sizingStyle}
      >
        <div
          role="grid"
          aria-label="Transactions"
          aria-describedby={instructionsId}
          aria-rowcount={rowCount}
          aria-colcount={1}
          aria-multiselectable="true"
          className="transactions-list relative mx-2 text-[13px]"
          style={style}
        >
          {children}
        </div>
      </div>
    </>
  )
}

interface VirtualizedTransactionRowProps
  extends Omit<ComponentPropsWithoutRef<"div">, "role" | "style" | "tabIndex"> {
  rowKey: string
  index: number
  start: number
  isFocused: boolean
  flagged?: boolean
  isSelected?: boolean
  selectionDisabled?: boolean
  onSelectionClick?: (event: MouseEvent<HTMLButtonElement>) => void
  tabIndex: number
}

export const VirtualizedTransactionRow = memo(
  function VirtualizedTransactionRow({
    rowKey,
    index,
    start,
    isFocused,
    isSelected,
    flagged,
    selectionDisabled,
    onSelectionClick,
    tabIndex,
    className,
    children,
    ...props
  }: VirtualizedTransactionRowProps) {
    return (
      <div
        {...props}
        role="row"
        data-index={index}
        data-list-key={rowKey}
        data-focused={isFocused || undefined}
        data-flagged={flagged || undefined}
        aria-rowindex={index + 1}
        aria-selected={isSelected}
        className={cn(
          "group/transaction-row absolute left-0 top-0 w-full cursor-pointer select-none rounded-lg border-0 text-foreground",
          flagged
            ? "bg-yellow-200/65 hover:bg-yellow-200/85 dark:bg-yellow-400/15 dark:hover:bg-yellow-400/25"
            : isSelected
              ? "bg-fina-violet/10 hover:bg-fina-violet/15"
              : isFocused
                ? "bg-fina-violet/5 hover:bg-fina-violet/10"
                : "bg-fina-surface hover:bg-foreground/[0.035] dark:bg-fina-canvas dark:hover:bg-foreground/[0.035]",
          className
        )}
        style={{
          height: TRANSACTION_LIST_ROW_HEIGHT,
          transform: `translateY(${start}px)`
        }}
      >
        <div
          role="gridcell"
          aria-colindex={1}
          tabIndex={tabIndex}
          data-list-focus-target="true"
          aria-keyshortcuts="ArrowDown ArrowUp J K Enter Space X Shift+ArrowDown Shift+ArrowUp Meta+A Control+A Escape"
          className="grid h-full w-full min-w-0 items-center gap-2 rounded-[inherit] px-6 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-fina-violet/35"
          style={{ gridTemplateColumns: "var(--transaction-list-columns)" }}
        >
          {onSelectionClick ? (
            <button
              type="button"
              role="checkbox"
              aria-label="Select transaction"
              aria-checked={Boolean(isSelected)}
              disabled={selectionDisabled}
              className={cn(
                "absolute left-0 top-0 flex h-full w-6 items-center justify-center rounded-l-[inherit] opacity-0 outline-none group-hover/transaction-row:opacity-100 group-focus-within/transaction-row:opacity-100 focus-visible:bg-fina-violet/10 disabled:cursor-not-allowed [@media(hover:none)]:opacity-100 [@media(pointer:coarse)]:opacity-100",
                isSelected && "opacity-100"
              )}
              onClick={(event) => {
                event.stopPropagation()
                onSelectionClick(event)
              }}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-3.5 items-center justify-center rounded-[3px] border",
                  isSelected
                    ? "border-fina-violet bg-fina-violet text-white"
                    : "border-foreground/35 bg-transparent",
                  selectionDisabled && "opacity-50"
                )}
              >
                {isSelected ? (
                  <Check className="size-2.5" strokeWidth={3} />
                ) : null}
              </span>
            </button>
          ) : null}
          {children}
        </div>
      </div>
    )
  }
)
