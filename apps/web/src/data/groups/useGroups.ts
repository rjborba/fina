import { groupsControllerFindAll } from "@/api/generated"
import { useAuth } from "@/hooks/useAuth"
import { useQuery } from "@tanstack/react-query"

export const useGroups = () => {
  const { user } = useAuth()
  return useQuery({
    enabled: !!user,
    queryKey: ["groups", user?.id],
    queryFn: () => groupsControllerFindAll()
  })
}
