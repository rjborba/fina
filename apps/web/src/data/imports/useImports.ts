import { importsControllerFindAll } from "@/api/generated"
import { useQuery } from "@tanstack/react-query"

export const useImports = ({ groupId }: { groupId?: string }) =>
  useQuery({
    enabled: !!groupId,
    queryKey: ["imports", groupId],
    queryFn: () => importsControllerFindAll({ groupId: groupId! })
  })
