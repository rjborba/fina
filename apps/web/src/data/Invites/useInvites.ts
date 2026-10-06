import { invitesControllerFindAll } from "@/api/generated"
import { useQuery } from "@tanstack/react-query"

export const useInvites = (groupId?: string) =>
  useQuery({
    enabled: !!groupId,
    queryKey: ["invites", groupId],
    queryFn: () => invitesControllerFindAll({ groupId: groupId! })
  })
