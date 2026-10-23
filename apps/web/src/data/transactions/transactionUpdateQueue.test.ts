import type {
  CreditCardBillDetail,
  QueryTransactionOutputDtoType,
  TransactionOutput
} from "@fina/types"
import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"
import { queueTransactionUpdate } from "./transactionUpdateQueue"

const firstCategory = {
  id: "10",
  name: "First",
  icon: "tag",
  color: "teal"
} as const
const secondCategory = {
  id: "11",
  name: "Second",
  icon: "tag",
  color: "violet"
} as const
const initial = {
  id: "7",
  description: "Purchase",
  category: null,
  observation: null,
  commentCount: 0,
  conversationResolved: false
} as TransactionOutput
const ledgerKey = ["transactions", "fixture"]
const billKey = ["credit-card-bills", "detail", "group", "account", "2026-10"]
const clients: QueryClient[] = []

function fixture() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  clients.push(client)
  const rows = [initial, { ...initial, id: "8" }]
  client.setQueryData(ledgerKey, { data: rows, totalCount: rows.length })
  client.setQueryData(billKey, { transactions: rows })
  return client
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((success, failure) => {
    resolve = success
    reject = failure
  })
  return { promise, resolve, reject }
}

function rows(client: QueryClient) {
  return [
    client.getQueryData<QueryTransactionOutputDtoType>(ledgerKey)!.data,
    client.getQueryData<CreditCardBillDetail>(billKey)!.transactions
  ]
}

afterEach(() => {
  for (const client of clients.splice(0)) client.clear()
})

describe("transaction update queue", () => {
  it("keeps conversation changes when a delayed category response arrives", async () => {
    const client = fixture()
    const response = deferred<TransactionOutput>()
    const send = vi.fn(() => response.promise)
    const pending = queueTransactionUpdate(
      client,
      { id: "7", transaction: { category: firstCategory } },
      send
    )
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce())
    client.setQueryData<QueryTransactionOutputDtoType>(
      ledgerKey,
      (page) =>
        page && {
          ...page,
          data: page.data.map((row) => ({
            ...row,
            commentCount: 2,
            conversationResolved: true
          }))
        }
    )
    client.setQueryData<CreditCardBillDetail>(
      billKey,
      (bill) =>
        bill && {
          ...bill,
          transactions: bill.transactions.map((row) => ({
            ...row,
            commentCount: 2,
            conversationResolved: true
          }))
        }
    )
    response.resolve({ ...initial, category: firstCategory })
    await pending
    for (const page of rows(client))
      expect(page[0]).toMatchObject({
        category: firstCategory,
        commentCount: 2,
        conversationResolved: true
      })
  })
  it.each([
    [true, true, "11"],
    [false, true, "11"],
    [true, false, "10"],
    [false, false, null]
  ] as const)(
    "preserves the newest choice while ordered saves finish (%s, %s)",
    async (firstSucceeds, secondSucceeds, expectedId) => {
      const client = fixture()
      const first = deferred<TransactionOutput>()
      const second = deferred<TransactionOutput>()
      const sendFirst = vi.fn(() => first.promise)
      const sendSecond = vi.fn(() => second.promise)
      const firstResult = queueTransactionUpdate(
        client,
        { id: "7", transaction: { category: firstCategory } },
        sendFirst
      ).catch(() => null)
      const secondResult = queueTransactionUpdate(
        client,
        { id: "7", transaction: { category: secondCategory } },
        sendSecond
      ).catch(() => null)
      await vi.waitFor(() => {
        expect(sendFirst).toHaveBeenCalledOnce()
        for (const page of rows(client)) expect(page[0].category?.id).toBe("11")
      })
      expect(sendSecond).not.toHaveBeenCalled()

      // Background responses cannot flash an older category over a pending choice.
      client.setQueryData(ledgerKey, { data: [initial], totalCount: 1 })
      client.setQueryData(billKey, { transactions: [initial] })
      for (const page of rows(client)) expect(page[0].category?.id).toBe("11")
      if (firstSucceeds) first.resolve({ ...initial, category: firstCategory })
      else first.reject(new Error("Request failed"))
      await firstResult
      await vi.waitFor(() => expect(sendSecond).toHaveBeenCalledOnce())
      for (const page of rows(client)) expect(page[0].category?.id).toBe("11")
      if (secondSucceeds)
        second.resolve({ ...initial, category: secondCategory })
      else second.reject(new Error("Request failed"))
      await secondResult
      for (const page of rows(client))
        expect(page[0].category?.id ?? null).toBe(expectedId)
    }
  )

  it("queues notes and clearing behind the same record but saves other records independently", async () => {
    const client = fixture()
    const category = deferred<TransactionOutput>()
    const note = deferred<TransactionOutput>()
    const clear = deferred<TransactionOutput>()
    const other = deferred<TransactionOutput>()
    const sendNote = vi.fn(() => note.promise)
    const sendClear = vi.fn(() => clear.promise)
    const sendOther = vi.fn(() => other.promise)
    const categoryResult = queueTransactionUpdate(
      client,
      { id: "7", transaction: { category: firstCategory } },
      () => category.promise
    )
    const noteResult = queueTransactionUpdate(
      client,
      { id: "7", transaction: { observation: "New note" } },
      sendNote
    )
    const clearResult = queueTransactionUpdate(
      client,
      { id: "7", transaction: { category: null } },
      sendClear
    ).catch(() => null)
    const otherResult = queueTransactionUpdate(
      client,
      { id: "8", transaction: { category: secondCategory } },
      sendOther
    )
    await vi.waitFor(() => expect(sendOther).toHaveBeenCalledOnce())
    for (const page of rows(client)) {
      expect(page[0]).toMatchObject({ category: null, observation: "New note" })
      expect(page[1].category?.id).toBe("11")
    }
    expect(sendNote).not.toHaveBeenCalled()
    expect(sendClear).not.toHaveBeenCalled()
    other.resolve({ ...initial, id: "8", category: secondCategory })
    await otherResult
    category.resolve({ ...initial, category: firstCategory })
    await categoryResult
    await vi.waitFor(() => expect(sendNote).toHaveBeenCalledOnce())
    for (const page of rows(client))
      expect(page[0]).toMatchObject({ category: null, observation: "New note" })
    note.resolve({
      ...initial,
      category: firstCategory,
      observation: "New note"
    })
    await noteResult
    await vi.waitFor(() => expect(sendClear).toHaveBeenCalledOnce())
    clear.reject(new Error("Request failed"))
    await clearResult
    for (const page of rows(client)) {
      expect(page[0]).toMatchObject({
        category: { id: "10" },
        observation: "New note"
      })
      expect(page[1].category?.id).toBe("11")
    }
  })

  it("does not share queues or optimistic data between query clients", async () => {
    const firstClient = fixture()
    const secondClient = fixture()
    const held = deferred<TransactionOutput>()
    const pending = queueTransactionUpdate(
      firstClient,
      { id: "7", transaction: { category: firstCategory } },
      () => held.promise
    )
    const independent = queueTransactionUpdate(
      secondClient,
      { id: "7", transaction: { category: secondCategory } },
      async () => ({ ...initial, category: secondCategory })
    )
    await independent
    for (const page of rows(secondClient))
      expect(page[0].category?.id).toBe("11")
    held.resolve({ ...initial, category: firstCategory })
    await pending
    for (const page of rows(firstClient))
      expect(page[0].category?.id).toBe("10")
    for (const page of rows(secondClient))
      expect(page[0].category?.id).toBe("11")
  })
})
