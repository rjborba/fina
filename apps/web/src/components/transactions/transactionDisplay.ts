export const TRANSACTION_DISPLAY_PROPERTIES = [
  { id: "date", label: "Date" },
  // Preserve the stored key while Account now controls the complete chip.
  { id: "accountName", label: "Account" },
  { id: "card", label: "Card name" },
  { id: "cardNumber", label: "Card number" },
  { id: "category", label: "Category" },
  { id: "installment", label: "Installment" },
  { id: "value", label: "Amount" }
] as const

export type TransactionDisplayProperty =
  (typeof TRANSACTION_DISPLAY_PROPERTIES)[number]["id"]

export type TransactionDisplayProperties = Record<
  TransactionDisplayProperty,
  boolean
>

export const DEFAULT_TRANSACTION_DISPLAY_PROPERTIES: TransactionDisplayProperties =
  {
    date: true,
    accountName: false,
    card: true,
    cardNumber: false,
    category: true,
    installment: true,
    value: true
  }

export function normalizeTransactionDisplayProperties(
  value: unknown
): TransactionDisplayProperties {
  const properties = { ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return properties
  }

  for (const { id } of TRANSACTION_DISPLAY_PROPERTIES) {
    const storedValue = (value as Record<string, unknown>)[id]
    if (typeof storedValue === "boolean") properties[id] = storedValue
  }
  return properties
}
