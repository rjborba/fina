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
