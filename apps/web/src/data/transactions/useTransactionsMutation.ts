import {
  transactionsControllerCreate,
  transactionsControllerRemove,
  transactionsControllerUpdate
} from "@/api/generated"
import {
  CreateTransactionInputDtoType,
  QueryTransactionOutputDtoType,
  TransactionOutput,
  UpdateTransactionInputDtoSchema
} from "@fina/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const DELETE_BATCH_SIZE = 10

export const updateTransactionInPage = (
  page: QueryTransactionOutputDtoType | undefined,
  id: string,
  transaction: Partial<TransactionOutput>
) => {
  if (!page) {
    return page
  }

  return {
    ...page,
    data: page.data.map((current) =>
      current.id === id ? { ...current, ...transaction } : current
    )
  }
}

export const useTransactionMutation = () => {
  const queryClient = useQueryClient()

  const addMutation = useMutation({
    retry: 0,
    mutationFn: (input: CreateTransactionInputDtoType) =>
      transactionsControllerCreate({ requestBody: input }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-card-bills"] })
      ])
    }
  })

  const updateMutation = useMutation({
    retry: 0,
    mutationFn: async ({
      id,
      transaction
    }: {
      id: string
      transaction: Partial<TransactionOutput>
    }) => {
      const update = {
        description: transaction.description,
        value: transaction.value,
        date: transaction.date,
        installmentTotal: transaction.installmentTotal,
        installmentCurrent: transaction.installmentCurrent,
        creditDueDate: transaction.creditDueDate,
        observation: transaction.observation,
        toBeConsideredAt: transaction.toBeConsideredAt,
        calculatedDate: transaction.calculatedDate,
        categoryId:
          transaction.category === null ? null : transaction.category?.id,
        bankaccountId:
          transaction.bankaccount === null ? null : transaction.bankaccount?.id
      }
      const validated = UpdateTransactionInputDtoSchema.parse(update)
      return transactionsControllerUpdate({ id, requestBody: validated })
    },
    onMutate: async ({ id, transaction }) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] })

      const previousTransactions =
        queryClient.getQueriesData<QueryTransactionOutputDtoType>({
          queryKey: ["transactions"]
        })

      queryClient.setQueriesData<QueryTransactionOutputDtoType>(
        { queryKey: ["transactions"] },
        (page) => updateTransactionInPage(page, id, transaction)
      )

      return { previousTransactions }
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, data] of context?.previousTransactions || []) {
        queryClient.setQueryData(queryKey, data)
      }
    },
    onSuccess: (updatedTransaction) => {
      queryClient.setQueriesData<QueryTransactionOutputDtoType>(
        { queryKey: ["transactions"] },
        (page) =>
          updateTransactionInPage(
            page,
            updatedTransaction.id,
            updatedTransaction
          )
      )
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-card-bills"] })
      ])
    }
  })

  const removeMutation = useMutation({
    retry: 0,
    mutationFn: (id: string) => transactionsControllerRemove({ id }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-card-bills"] })
      ])
    }
  })

  const removeManyMutation = useMutation({
    retry: 0,
    mutationFn: async (ids: string[]) => {
      for (let index = 0; index < ids.length; index += DELETE_BATCH_SIZE) {
        await Promise.all(
          ids
            .slice(index, index + DELETE_BATCH_SIZE)
            .map((id) => transactionsControllerRemove({ id }))
        )
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-card-bills"] })
      ])
    }
  })

  return { addMutation, updateMutation, removeMutation, removeManyMutation }
}
