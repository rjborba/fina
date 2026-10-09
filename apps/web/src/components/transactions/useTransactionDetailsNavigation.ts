import type { TransactionOutput } from "@fina/types"
import { useCallback, useEffect, useMemo, useState } from "react"

interface DetailsNavigation {
  groupId: string | undefined
  transactionIds: string[]
  selectedTransactionId: string
}

export function useTransactionDetailsNavigation(
  transactions: readonly TransactionOutput[],
  groupId: string | undefined
) {
  const [navigation, setNavigation] = useState<DetailsNavigation | null>(null)
  const currentNavigation = navigation?.groupId === groupId ? navigation : null
  useEffect(() => {
    setNavigation((current) => (current?.groupId === groupId ? current : null))
  }, [groupId])
  const transactionsById = useMemo(
    () =>
      new Map(transactions.map((transaction) => [transaction.id, transaction])),
    [transactions]
  )
  const availableTransactionIds = useMemo(
    () =>
      currentNavigation?.transactionIds.filter((id) =>
        transactionsById.has(id)
      ) ?? [],
    [currentNavigation, transactionsById]
  )
  const currentTransactionIndex = currentNavigation
    ? availableTransactionIds.indexOf(currentNavigation.selectedTransactionId)
    : -1
  const transaction = currentNavigation
    ? (transactionsById.get(currentNavigation.selectedTransactionId) ?? null)
    : null

  const openTransaction = useCallback(
    (selectedTransactionId: string) => {
      // Preserve the opening order while reading each record's latest edits.
      setNavigation({
        groupId,
        transactionIds: transactions.map((transaction) => transaction.id),
        selectedTransactionId
      })
    },
    [groupId, transactions]
  )
  const onOpenChange = useCallback((open: boolean) => {
    if (!open) setNavigation(null)
  }, [])
  const moveTransaction = useCallback(
    (direction: -1 | 1) => {
      setNavigation((current) => {
        if (!current || current.groupId !== groupId) return null

        const availableIds = current.transactionIds.filter((id) =>
          transactionsById.has(id)
        )
        const currentIndex = availableIds.indexOf(current.selectedTransactionId)
        if (currentIndex < 0) return current

        const selectedTransactionId = availableIds[currentIndex + direction]
        return selectedTransactionId
          ? { ...current, selectedTransactionId }
          : current
      })
    },
    [groupId, transactionsById]
  )
  const onNextTransaction = useCallback(
    () => moveTransaction(1),
    [moveTransaction]
  )
  const onPreviousTransaction = useCallback(
    () => moveTransaction(-1),
    [moveTransaction]
  )

  return {
    transaction,
    open: currentNavigation !== null && transaction !== null,
    onOpenChange,
    openTransaction,
    currentTransactionIndex,
    totalTransactions: availableTransactionIds.length,
    onNextTransaction,
    onPreviousTransaction
  }
}
