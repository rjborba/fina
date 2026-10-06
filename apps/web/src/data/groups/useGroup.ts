import { groupsControllerFindOne } from "@/api/generated"
import { useQuery } from "@tanstack/react-query"

export const useGroupById = (groupId?: string) =>
  useQuery({
    enabled: !!groupId,
    queryKey: ["group", groupId],
    queryFn: () => groupsControllerFindOne({ id: groupId! })
  })
