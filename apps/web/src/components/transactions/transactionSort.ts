import type { TransactionOutput as Transaction } from "@fina/types"
import dayjs from "dayjs"

export type TransactionSortOption =
  | "date-desc"
  | "date-asc"
  | "value-desc"
  | "value-asc"
  | "description-asc"
  | "description-desc"
  | "category-asc"
  | "category-desc"

export const DEFAULT_TRANSACTION_SORT: TransactionSortOption = "date-desc"

export const TRANSACTION_SORT_OPTIONS: ReadonlyArray<{
  value: TransactionSortOption
  label: string
  shortLabel: string
}> = [
  { value: "date-desc", label: "Date — newest first", shortLabel: "Date ↓" },
  { value: "date-asc", label: "Date — oldest first", shortLabel: "Date ↑" },
  {
    value: "value-desc",
    label: "Value — highest first",
    shortLabel: "Value ↓"
  },
  {
    value: "value-asc",
    label: "Value — lowest first",
    shortLabel: "Value ↑"
  },
  {
    value: "description-asc",
    label: "Description — A to Z",
    shortLabel: "Description A–Z"
  },
  {
    value: "description-desc",
    label: "Description — Z to A",
    shortLabel: "Description Z–A"
  },
  {
    value: "category-asc",
    label: "Category — A to Z",
    shortLabel: "Category A–Z"
  },
  {
    value: "category-desc",
    label: "Category — Z to A",
    shortLabel: "Category Z–A"
  }
]

export function getTransactionSortLabel(value: TransactionSortOption) {
  return (
    TRANSACTION_SORT_OPTIONS.find((option) => option.value === value)
      ?.shortLabel || "Date ↓"
  )
}

export function sortTransactions(
  transactions: readonly Transaction[],
  option: TransactionSortOption,
  dateBasis: "cash-flow" | "monthly-review" | "purchase-date" = "cash-flow"
) {
  const direction = option.endsWith("-desc") ? -1 : 1
  const field = option.replace(/-(asc|desc)$/, "")

  return [...transactions].sort((left, right) => {
    let comparison = 0

    switch (field) {
      case "date":
        comparison =
          dayjs(
            dateBasis === "monthly-review"
              ? `${left.reviewMonth}-01`
              : dateBasis === "purchase-date"
                ? left.date
                : (left.cashFlowDate ?? left.calculatedDate)
          ).valueOf() -
          dayjs(
            dateBasis === "monthly-review"
              ? `${right.reviewMonth}-01`
              : dateBasis === "purchase-date"
                ? right.date
                : (right.cashFlowDate ?? right.calculatedDate)
          ).valueOf()
        break
      case "value":
        comparison = (left.value || 0) - (right.value || 0)
        break
      case "description":
        comparison = (left.description || "").localeCompare(
          right.description || "",
          "pt-BR",
          {
            sensitivity: "base"
          }
        )
        break
      case "category":
        comparison = (left.category?.name || "").localeCompare(
          right.category?.name || "",
          "pt-BR",
          { sensitivity: "base" }
        )
        break
    }

    return comparison * direction
  })
}
