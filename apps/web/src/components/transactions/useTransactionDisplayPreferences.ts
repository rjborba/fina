import useLocalStorageState from "@/hooks/useLocalStorageState"
import { useMemo } from "react"
import {
  DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
  normalizeTransactionDisplayProperties,
  type TransactionDisplayProperties
} from "./transactionDisplay"
import {
  DEFAULT_TRANSACTION_SORT,
  TRANSACTION_SORT_OPTIONS,
  type TransactionSortOption
} from "./transactionSort"

export function useTransactionDisplayPreferences() {
  const [storedProperties, setStoredProperties] = useLocalStorageState<unknown>(
    "transactionDisplay:v1",
    DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
  )
  const [storedSort, setStoredSort] = useLocalStorageState<unknown>(
    "transactionSort:v1",
    DEFAULT_TRANSACTION_SORT
  )
  const displayProperties = useMemo(
    () => normalizeTransactionDisplayProperties(storedProperties),
    [storedProperties]
  )
  const sort =
    TRANSACTION_SORT_OPTIONS.find((option) => option.value === storedSort)
      ?.value ?? DEFAULT_TRANSACTION_SORT

  return {
    sort,
    setSort: (value: TransactionSortOption) => setStoredSort(value),
    displayProperties,
    setDisplayProperties: (value: TransactionDisplayProperties) =>
      setStoredProperties(normalizeTransactionDisplayProperties(value))
  }
}
