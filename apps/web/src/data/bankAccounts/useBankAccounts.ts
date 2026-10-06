import { bankaccountsControllerFindAll } from "@/api/generated"
import { useQuery } from "@tanstack/react-query"

export const useBankAccounts = ({ groupId }: { groupId?: string }) =>
  useQuery({
    enabled: !!groupId,
    queryKey: ["bankaccounts", groupId],
    queryFn: () => bankaccountsControllerFindAll({ groupId: groupId! })
  })
