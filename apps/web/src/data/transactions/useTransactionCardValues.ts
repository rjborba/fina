import { transactionsControllerCardValues } from "@/api/generated"
import { useQuery } from "@tanstack/react-query"

export function useTransactionCardValues({
  groupId,
  accountId
}: {
  groupId?: string
  accountId?: string
}) {
  return useQuery({
    enabled: !!groupId,
    queryKey: ["transaction-card-values", groupId, accountId],
    queryFn: () =>
      transactionsControllerCardValues({ groupId: groupId!, accountId })
  })
}
