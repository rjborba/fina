import type {
  CardMetadata,
  CategoryOutput,
  TransactionOutput
} from "@fina/types"

export const toggleTransactionSelection = (
  selection: ReadonlySet<string>,
  transactionId: string
) => {
  const nextSelection = new Set(selection)

  if (nextSelection.has(transactionId)) {
    nextSelection.delete(transactionId)
  } else {
    nextSelection.add(transactionId)
  }

  return nextSelection
}

export function summarizeTransactionSelection(
  transactions: readonly Pick<TransactionOutput, "id" | "value">[],
  selection: ReadonlySet<string>
) {
  let selectedTotal = 0
  let unavailableValueCount = 0
  for (const transaction of transactions) {
    if (!selection.has(transaction.id)) continue
    if (transaction.value === null || !Number.isFinite(transaction.value))
      unavailableValueCount += 1
    else selectedTotal += transaction.value
  }
  return { selectedTotal, unavailableValueCount }
}

/** Reuse the scoped single-transaction mutation without flooding the API. */
export async function assignCategoryToTransactionSelection(
  transactionIds: readonly string[],
  category: Pick<CategoryOutput, "id" | "name" | "icon" | "color"> | null,
  updateTransaction: (
    id: string,
    transaction: Partial<TransactionOutput>
  ) => Promise<void>
) {
  return updateTransactionSelection(
    transactionIds,
    { category },
    updateTransaction
  )
}

export function selectedCreditAccountId(
  transactions: readonly Pick<TransactionOutput, "id" | "bankaccount">[],
  selection: ReadonlySet<string>
): string | null {
  if (!selection.size) return null
  const selected = transactions.filter((transaction) =>
    selection.has(transaction.id)
  )
  if (selected.length !== selection.size) return null
  const accountId = selected[0]?.bankaccount?.id
  return accountId &&
    selected.every(
      (transaction) =>
        transaction.bankaccount?.type === "credit" &&
        transaction.bankaccount.id === accountId
    )
    ? accountId
    : null
}

export async function assignCardToTransactionSelection(
  transactionIds: readonly string[],
  card: CardMetadata,
  updateTransaction: (
    id: string,
    transaction: Partial<TransactionOutput>
  ) => Promise<void>
) {
  return updateTransactionSelection(transactionIds, card, updateTransaction)
}

async function updateTransactionSelection(
  transactionIds: readonly string[],
  update: Partial<TransactionOutput>,
  updateTransaction: (
    id: string,
    transaction: Partial<TransactionOutput>
  ) => Promise<void>
) {
  let nextIndex = 0
  let updatedCount = 0
  let failedCount = 0
  await Promise.all(
    Array.from({ length: Math.min(8, transactionIds.length) }, async () => {
      while (nextIndex < transactionIds.length) {
        const id = transactionIds[nextIndex++]
        try {
          await updateTransaction(id, update)
          updatedCount += 1
        } catch {
          failedCount += 1
        }
      }
    })
  )
  return { updatedCount, failedCount }
}

export const selectTransactionRange = (
  transactionIds: readonly string[],
  anchorId: string | null,
  targetId: string,
  selection: ReadonlySet<string>
) => {
  const targetIndex = transactionIds.indexOf(targetId)

  if (targetIndex === -1) {
    return new Set(selection)
  }

  const anchorIndex = anchorId ? transactionIds.indexOf(anchorId) : -1
  const rangeStart = anchorIndex === -1 ? targetIndex : anchorIndex
  const from = Math.min(rangeStart, targetIndex)
  const to = Math.max(rangeStart, targetIndex)
  const nextSelection = new Set(selection)

  for (let index = from; index <= to; index += 1) {
    nextSelection.add(transactionIds[index])
  }

  return nextSelection
}
