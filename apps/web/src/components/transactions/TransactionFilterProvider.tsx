import { createStore, Provider } from "jotai"
import { useEffect, useState, type ReactNode } from "react"
import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import {
  readTransactionFilters,
  writeTransactionFilters
} from "@/data/transactions/transactionFilterStorage"

/** Key this provider by storageKey to isolate each user/workspace's filters. */
export function TransactionFilterProvider({
  storageKey,
  children
}: {
  storageKey: string
  children: ReactNode
}) {
  const [store] = useState(() => {
    const scopedStore = createStore()
    // Hydrate before children render so the first query uses the saved range.
    scopedStore.set(transactionFilterAtom, readTransactionFilters(storageKey))
    return scopedStore
  })

  useEffect(() => {
    const persistFilters = () =>
      writeTransactionFilters(storageKey, store.get(transactionFilterAtom))
    persistFilters()
    return store.sub(transactionFilterAtom, persistFilters)
  }, [storageKey, store])

  return <Provider store={store}>{children}</Provider>
}
