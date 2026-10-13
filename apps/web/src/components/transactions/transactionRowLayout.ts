import type { TransactionOutput } from "@fina/types"
import type { TransactionDisplayProperties } from "./transactionDisplay"

export type TransactionMetadataSlot =
  | "account-icon"
  | "import"
  | "status"
  | "account"
  | "card"
  | "installment"
  | "category"

export interface TransactionRowLayout {
  slots: {
    id: TransactionMetadataSlot
    width: number
    desktopOnly?: boolean
  }[]
  columns: string
  desktopColumns: string
  minWidth: number
  desktopExtraWidth: number
}

type TransactionMetadata = Pick<
  TransactionOutput,
  | "bankaccount"
  | "import"
  | "billPayment"
  | "installmentCurrent"
  | "installmentTotal"
>

const COLUMN_GAP = 12
const DESCRIPTION_MIN_WIDTH = 120
const ROW_HORIZONTAL_PADDING = 48
const INSTALLMENT_WIDTH = 64

/** Derive one layout from the complete loaded list, never its virtual slice. */
export function buildTransactionRowLayout(
  transactions: readonly TransactionMetadata[],
  displayProperties: TransactionDisplayProperties,
  { hasBills = false }: { hasBills?: boolean } = {}
): TransactionRowLayout {
  let hasAccount = hasBills
  let hasCredit = false
  let hasImport = false
  let hasPayment = false

  for (const transaction of transactions) {
    hasAccount ||= Boolean(transaction.bankaccount)
    hasCredit ||= transaction.bankaccount?.type === "credit"
    hasImport ||= Boolean(transaction.import)
    hasPayment ||= Boolean(transaction.billPayment)
  }

  const slots: TransactionRowLayout["slots"] = []
  if (displayProperties.account && hasAccount)
    slots.push({ id: "account-icon", width: 14 })
  if (displayProperties.sourceImport && hasImport)
    slots.push({ id: "import", width: 14 })
  if (hasBills) slots.push({ id: "status", width: 128 })
  else if (hasPayment)
    slots.push({ id: "status", width: 80, desktopOnly: true })
  if (displayProperties.account && hasAccount)
    slots.push({ id: "account", width: 96, desktopOnly: true })
  if (displayProperties.card && hasCredit)
    slots.push({ id: "card", width: 176 })
  if (displayProperties.installment)
    slots.push({ id: "installment", width: INSTALLMENT_WIDTH })
  if (displayProperties.category) slots.push({ id: "category", width: 128 })

  const baseSlots = slots.filter((slot) => !slot.desktopOnly)
  const columns = (columns: TransactionRowLayout["slots"]) =>
    [
      `minmax(${DESCRIPTION_MIN_WIDTH}px, 1fr)`,
      ...columns.map(({ width }) => `${width}px`)
    ].join(" ")

  return {
    slots,
    columns: columns(baseSlots),
    desktopColumns: columns(slots),
    minWidth:
      ROW_HORIZONTAL_PADDING +
      DESCRIPTION_MIN_WIDTH +
      (displayProperties.date ? 112 + COLUMN_GAP : 0) +
      (displayProperties.value ? 132 + COLUMN_GAP : 0) +
      baseSlots.reduce((width, slot) => width + slot.width + COLUMN_GAP, 0),
    desktopExtraWidth: slots.reduce(
      (width, slot) => width + (slot.desktopOnly ? slot.width + COLUMN_GAP : 0),
      0
    )
  }
}
