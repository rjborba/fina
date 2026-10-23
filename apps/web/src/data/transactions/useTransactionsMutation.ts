import {
  transactionsControllerCreate,
  transactionsControllerRemove,
  transactionsControllerUpdate
} from "@/api/generated"
import {
  CreateTransactionInputDtoType,
  UpdateTransactionInputDtoSchema
} from "@fina/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  queueTransactionUpdate,
  type TransactionUpdate
} from "./transactionUpdateQueue"

export {
  updateTransactionInPage,
  updateTransactionInBillDetail
} from "./transactionUpdateQueue"

const DELETE_BATCH_SIZE = 10

export const useTransactionMutation = () => {
  const queryClient = useQueryClient()

  const addMutation = useMutation({
    retry: 0,
    mutationFn: (input: CreateTransactionInputDtoType) =>
      transactionsControllerCreate({ requestBody: input }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-card-bills"] }),
        queryClient.invalidateQueries({ queryKey: ["transaction-card-values"] })
      ])
    }
  })

  const updateMutation = useMutation({
    retry: 0,
    mutationFn: ({ id, transaction }: TransactionUpdate) =>
      queueTransactionUpdate(queryClient, { id, transaction }, async () => {
        const update = {
          flagged: transaction.flagged,
          description: transaction.description,
          value: transaction.value,
          date: transaction.date,
          installmentTotal: transaction.installmentTotal,
          installmentCurrent: transaction.installmentCurrent,
          creditDueDate: transaction.creditDueDate,
          toBeConsideredAt: transaction.toBeConsideredAt,
          calculatedDate: transaction.calculatedDate,
          categoryId:
            transaction.category === null ? null : transaction.category?.id,
          bankaccountId:
            transaction.bankaccount === null
              ? null
              : transaction.bankaccount?.id,
          cardName: transaction.cardName,
          cardLast4: transaction.cardLast4
        }
        const validated = UpdateTransactionInputDtoSchema.parse(update)
        return transactionsControllerUpdate({ id, requestBody: validated })
      })
  })

  const removeMutation = useMutation({
    retry: 0,
    mutationFn: (id: string) => transactionsControllerRemove({ id }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-card-bills"] }),
        queryClient.invalidateQueries({ queryKey: ["transaction-card-values"] })
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
        queryClient.invalidateQueries({ queryKey: ["credit-card-bills"] }),
        queryClient.invalidateQueries({ queryKey: ["transaction-card-values"] })
      ])
    }
  })

  return { addMutation, updateMutation, removeMutation, removeManyMutation }
}
