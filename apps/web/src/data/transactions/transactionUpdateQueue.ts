import type {
  CreditCardBillDetail,
  QueryTransactionOutputDtoType,
  TransactionOutput
} from "@fina/types"
import {
  notifyManager,
  type QueryClient,
  type QueryKey
} from "@tanstack/react-query"

export interface TransactionUpdate {
  id: string
  transaction: Partial<TransactionOutput>
}

export const updateTransactionInPage = (
  page: QueryTransactionOutputDtoType | undefined,
  id: string,
  transaction: Partial<TransactionOutput>
) =>
  page && {
    ...page,
    data: page.data.map((row) =>
      row.id === id ? { ...row, ...transaction } : row
    )
  }

export const updateTransactionInBillDetail = (
  detail: CreditCardBillDetail | undefined,
  id: string,
  transaction: Partial<TransactionOutput>
) =>
  detail && {
    ...detail,
    transactions: detail.transactions.map((row) =>
      row.id === id ? { ...row, ...transaction } : row
    )
  }

const isTransactionQuery = (key: QueryKey) =>
  key[0] === "transactions" ||
  (key[0] === "credit-card-bills" && key[1] === "detail")

interface PendingWrite {
  patch: Partial<TransactionOutput>
  ready: Promise<unknown>
  send: () => Promise<TransactionOutput>
  resolve: (transaction: TransactionOutput) => void
  reject: (error: unknown) => void
}

interface RecordQueue {
  confirmed: Partial<TransactionOutput>
  pending: PendingWrite[]
}

class TransactionUpdateQueue {
  private records = new Map<string, RecordQueue>()
  private unsubscribe?: () => void
  private publishing = false

  constructor(private client: QueryClient) {}

  enqueue({ id, transaction }: TransactionUpdate, send: PendingWrite["send"]) {
    let record = this.records.get(id)
    const start = !record
    if (!record) {
      record = { confirmed: {}, pending: [] }
      this.records.set(id, record)
    }
    this.captureBaseline(id, record, Object.keys(transaction))
    if (!this.unsubscribe) {
      this.unsubscribe = this.client.getQueryCache().subscribe((event) => {
        // A focus/refetch response must not replace newer unsaved choices.
        if (
          event.type === "updated" &&
          event.action.type === "success" &&
          isTransactionQuery(event.query.queryKey)
        )
          this.publish()
      })
    }

    return new Promise<TransactionOutput>((resolve, reject) => {
      const ready = Promise.all([
        this.client.cancelQueries({ queryKey: ["transactions"] }),
        this.client.cancelQueries({ queryKey: ["credit-card-bills", "detail"] })
      ])
      record.pending.push({
        patch: { ...transaction },
        ready,
        send,
        resolve,
        reject
      })
      void ready.then(() => this.publish())
      if (start) void this.drain(id, record)
    })
  }

  private captureBaseline(id: string, record: RecordQueue, fields: string[]) {
    let latest: TransactionOutput | undefined
    let updatedAt = -1
    for (const query of this.client
      .getQueryCache()
      .findAll({ predicate: (query) => isTransactionQuery(query.queryKey) })) {
      const rows =
        query.queryKey[0] === "transactions"
          ? (query.state.data as QueryTransactionOutputDtoType | undefined)
              ?.data
          : (query.state.data as CreditCardBillDetail | undefined)?.transactions
      const row = rows?.find((row) => row.id === id)
      if (row && query.state.dataUpdatedAt >= updatedAt) {
        latest = row
        updatedAt = query.state.dataUpdatedAt
      }
    }
    if (latest) {
      const missing = fields.filter(
        (field) =>
          !Object.prototype.hasOwnProperty.call(record.confirmed, field)
      )
      Object.assign(
        record.confirmed,
        Object.fromEntries(
          missing.map((field) => [
            field,
            latest[field as keyof TransactionOutput]
          ])
        )
      )
    }
  }

  private patchCaches(id: string, patch: Partial<TransactionOutput>) {
    this.client.setQueriesData<QueryTransactionOutputDtoType>(
      { queryKey: ["transactions"] },
      (page) => updateTransactionInPage(page, id, patch)
    )
    this.client.setQueriesData<CreditCardBillDetail>(
      { queryKey: ["credit-card-bills", "detail"] },
      (detail) => updateTransactionInBillDetail(detail, id, patch)
    )
  }

  private publish(serverTransaction?: TransactionOutput) {
    if (this.publishing) return
    this.publishing = true
    try {
      notifyManager.batch(() => {
        if (serverTransaction) {
          const financial: Partial<TransactionOutput> = { ...serverTransaction }
          // Conversation mutations have their own serialized cache lifecycle.
          // A delayed category response must not restore old thread status.
          delete financial.commentCount
          delete financial.conversationResolved
          this.patchCaches(serverTransaction.id, financial)
        }
        for (const [id, record] of this.records) {
          this.captureBaseline(
            id,
            record,
            record.pending.flatMap((write) => Object.keys(write.patch))
          )
          const visible = Object.assign(
            {},
            record.confirmed,
            ...record.pending.map((write) => write.patch)
          )
          this.patchCaches(id, visible)
        }
      })
    } finally {
      this.publishing = false
    }
  }

  private async drain(id: string, record: RecordQueue) {
    while (record.pending.length) {
      const write = record.pending[0]
      try {
        await write.ready
        const saved = await write.send()
        Object.assign(
          record.confirmed,
          Object.fromEntries(
            Object.keys(write.patch).map((field) => [
              field,
              saved[field as keyof TransactionOutput]
            ])
          )
        )
        record.pending.shift()
        this.publish(saved)
        write.resolve(saved)
      } catch (error) {
        record.pending.shift()
        this.publish()
        write.reject(error)
      }
    }
    this.records.delete(id)
    if (!this.records.size) {
      this.unsubscribe?.()
      this.unsubscribe = undefined
      // Reconcile once all queued writes settle; callers need not wait for GETs.
      void Promise.all([
        this.client.invalidateQueries({ queryKey: ["transactions"] }),
        this.client.invalidateQueries({ queryKey: ["credit-card-bills"] }),
        this.client.invalidateQueries({ queryKey: ["transaction-card-values"] })
      ])
    }
  }
}

// Client-scoped, in-memory only; record data is released as each queue drains.
const queues = new WeakMap<QueryClient, TransactionUpdateQueue>()

export function queueTransactionUpdate(
  client: QueryClient,
  update: TransactionUpdate,
  send: PendingWrite["send"]
) {
  let queue = queues.get(client)
  if (!queue) {
    queue = new TransactionUpdateQueue(client)
    queues.set(client, queue)
  }
  return queue.enqueue(update, send)
}
