import { userGroupsControllerFindAll } from "@/api/generated"
import { useQuery } from "@tanstack/react-query"

export const useUsersPerGroup = ({ groupId }: { groupId?: string }) =>
  useQuery({
    enabled: !!groupId,
    queryKey: ["usersPerGroup", groupId],
    queryFn: () => userGroupsControllerFindAll({ groupId: groupId! })
  })
