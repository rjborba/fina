export const TRANSACTION_DISPLAY_PROPERTIES = [
  { id: "date", label: "Date" },
  { id: "account", label: "Account" },
  { id: "card", label: "Card" },
  { id: "category", label: "Category" },
  { id: "installment", label: "Installment" },
  { id: "value", label: "Amount" },
  { id: "sourceImport", label: "Import" }
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
    account: true,
    card: true,
    category: true,
    installment: true,
    value: true,
    sourceImport: true
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
