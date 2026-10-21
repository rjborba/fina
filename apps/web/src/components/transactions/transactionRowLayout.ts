import type { TransactionOutput } from "@fina/types"
import type { TransactionDisplayProperties } from "./transactionDisplay"

export type TransactionMetadataSlot =
  | "status"
  | "account"
  | "card"
  | "card-number"
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
  | "cardName"
  | "cardLast4"
  | "import"
  | "billPayment"
  | "installmentCurrent"
  | "installmentTotal"
>

const COLUMN_GAP = 8
const DESCRIPTION_MIN_WIDTH = 120
const ROW_HORIZONTAL_PADDING = 48 + 32 + COLUMN_GAP
const INSTALLMENT_WIDTH = 40
export const TRANSACTION_DATE_WIDTH = 80

/** Derive one layout from the complete loaded list, never its virtual slice. */
export function buildTransactionRowLayout(
  transactions: readonly TransactionMetadata[],
  displayProperties: TransactionDisplayProperties,
  { hasBills = false }: { hasBills?: boolean } = {}
): TransactionRowLayout {
  let hasAccount = hasBills
  let hasCreditPurchase = false
  let hasCardNumber = false
  let hasPayment = false

  for (const transaction of transactions) {
    hasAccount ||= Boolean(transaction.bankaccount)
    if (transaction.bankaccount?.type === "credit") {
      hasCreditPurchase = true
      hasCardNumber ||= Boolean(transaction.cardLast4)
    }
    hasPayment ||= Boolean(transaction.billPayment)
  }

  const slots: TransactionRowLayout["slots"] = []
  if (hasBills) slots.push({ id: "status", width: 128 })
  else if (hasPayment)
    slots.push({ id: "status", width: 80, desktopOnly: true })
  if (displayProperties.accountName && hasAccount)
    slots.push({ id: "account", width: 128 })
  if (displayProperties.card && hasCreditPurchase)
    slots.push({ id: "card", width: 144 })
  if (displayProperties.cardNumber && hasCardNumber)
    slots.push({ id: "card-number", width: 56 })
  if (displayProperties.installment)
    slots.push({ id: "installment", width: INSTALLMENT_WIDTH })
  if (displayProperties.category) slots.push({ id: "category", width: 112 })

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
      (displayProperties.date ? TRANSACTION_DATE_WIDTH + COLUMN_GAP : 0) +
      (displayProperties.value ? 132 + COLUMN_GAP : 0) +
      baseSlots.reduce((width, slot) => width + slot.width + COLUMN_GAP, 0),
    desktopExtraWidth: slots.reduce(
      (width, slot) => width + (slot.desktopOnly ? slot.width + COLUMN_GAP : 0),
      0
    )
  }
}
