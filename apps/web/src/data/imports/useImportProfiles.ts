import { importsControllerFindProfiles } from "@/api/generated"
import { useQuery } from "@tanstack/react-query"

export const useImportProfiles = ({
  groupId,
  fingerprint
}: {
  groupId?: string
  fingerprint?: string
}) =>
  useQuery({
    enabled: !!groupId && !!fingerprint,
    queryKey: ["import-profiles", groupId, fingerprint],
    queryFn: () =>
      importsControllerFindProfiles({
        groupId: groupId!,
        fingerprint: fingerprint!
      })
  })
