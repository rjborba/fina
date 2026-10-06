import { invitesControllerFindMine } from "@/api/generated"
import { useAuth } from "@/hooks/useAuth"
import { useQuery } from "@tanstack/react-query"

export const useInvitesByUser = () => {
  const { user } = useAuth()
  return useQuery({
    enabled: !!user,
    queryKey: ["invites", "mine", user?.id],
    queryFn: () => invitesControllerFindMine()
  })
}
