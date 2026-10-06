import { categoriesControllerFindAll } from "@/api/generated"
import { useQuery } from "@tanstack/react-query"

export const useCategories = ({ groupId }: { groupId?: string }) =>
  useQuery({
    enabled: !!groupId,
    queryKey: ["categories", groupId],
    queryFn: () => categoriesControllerFindAll({ groupId: groupId! })
  })
