import { importsControllerFindProfiles } from "@/api/generated"
import { ImportProfileListOutputSchema } from "@fina/types"
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
    queryFn: async () =>
      ImportProfileListOutputSchema.parse(
        await importsControllerFindProfiles({
          groupId: groupId!,
          fingerprint: fingerprint!
        })
      )
  })
