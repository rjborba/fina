import {
  transactionsControllerConversation,
  transactionsControllerAddComment,
  transactionsControllerResolveConversation
} from "@/api/generated"
import type {
  CreditCardBillDetail,
  QueryTransactionOutputDtoType,
  TransactionConversation
} from "@fina/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import {
  updateTransactionInBillDetail,
  updateTransactionInPage
} from "./transactionUpdateQueue"

export function useTransactionConversation(id: string) {
  const client = useQueryClient()
  const key = ["transaction-conversation", id]
  const query = useQuery({
    queryKey: key,
    queryFn: () => transactionsControllerConversation({ id }),
    refetchOnWindowFocus: true,
    refetchInterval: 15_000
  })
  useEffect(() => {
    if (!query.data) return
    const patch = {
      commentCount: query.data.messages.length,
      conversationResolved: query.data.resolved
    }
    client.setQueriesData<QueryTransactionOutputDtoType>(
      { queryKey: ["transactions"] },
      (page) => updateTransactionInPage(page, id, patch)
    )
    client.setQueriesData<CreditCardBillDetail>(
      { queryKey: ["credit-card-bills", "detail"] },
      (detail) => updateTransactionInBillDetail(detail, id, patch)
    )
  }, [client, id, query.data])
  const saved = async (conversation: TransactionConversation) => {
    await Promise.all([
      client.cancelQueries({ queryKey: key }),
      client.cancelQueries({ queryKey: ["transactions"] }),
      client.cancelQueries({ queryKey: ["credit-card-bills", "detail"] })
    ])
    client.setQueryData(key, conversation)
    const patch = {
      commentCount: conversation.messages.length,
      conversationResolved: conversation.resolved
    }
    client.setQueriesData<QueryTransactionOutputDtoType>(
      { queryKey: ["transactions"] },
      (page) => updateTransactionInPage(page, id, patch)
    )
    client.setQueriesData<CreditCardBillDetail>(
      { queryKey: ["credit-card-bills", "detail"] },
      (detail) => updateTransactionInBillDetail(detail, id, patch)
    )
    await Promise.all([
      client.invalidateQueries({ queryKey: key }),
      client.invalidateQueries({ queryKey: ["transactions"] }),
      client.invalidateQueries({ queryKey: ["credit-card-bills"] })
    ])
  }
  const add = useMutation({
    scope: { id: `conversation-${id}` },
    retry: 0,
    mutationFn: (body: string) =>
      transactionsControllerAddComment({ id, requestBody: { body } }),
    onSuccess: saved
  })
  const resolve = useMutation({
    scope: { id: `conversation-${id}` },
    retry: 0,
    mutationFn: (resolved: boolean) =>
      transactionsControllerResolveConversation({
        id,
        requestBody: { resolved }
      }),
    onSuccess: saved
  })
  return { query, add, resolve }
}
