import {
  creditCardBillsControllerReconcile,
  creditCardBillsControllerUnlink
} from "@/api/generated"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { creditCardBillKeys } from "./useCreditCardBills"

interface BillIdentity {
  groupId: string
  accountId: string
  billMonth: string
}

export function useCreditCardBillMutation() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: creditCardBillKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    ])

  const reconcileMutation = useMutation({
    retry: 0,
    mutationFn: ({
      groupId,
      accountId,
      billMonth,
      paymentTransactionId
    }: BillIdentity & { paymentTransactionId: string }) =>
      creditCardBillsControllerReconcile({
        accountId,
        billMonth,
        requestBody: { groupId, paymentTransactionId }
      }),
    onSettled: invalidate
  })

  const unlinkMutation = useMutation({
    retry: 0,
    mutationFn: ({ groupId, accountId, billMonth }: BillIdentity) =>
      creditCardBillsControllerUnlink({ groupId, accountId, billMonth }),
    onSettled: invalidate
  })

  return { reconcileMutation, unlinkMutation }
}
