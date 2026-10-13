import { creditCardsControllerFindAll } from "@/api/generated"
import { useQuery } from "@tanstack/react-query"

export function useCreditCards({
  groupId,
  accountId,
  includeArchived = false
}: {
  groupId?: string
  accountId?: string
  includeArchived?: boolean
}) {
  return useQuery({
    enabled: !!groupId,
    queryKey: ["credit-cards", groupId, { accountId, includeArchived }],
    queryFn: () =>
      creditCardsControllerFindAll({
        groupId: groupId!,
        accountId,
        includeArchived
      })
  })
}
