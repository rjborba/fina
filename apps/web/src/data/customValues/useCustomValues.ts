import {
  customValuesControllerCreate,
  customValuesControllerFindAll,
  customValuesControllerRemove,
  customValuesControllerUpdate
} from "@/api/generated"
import {
  CustomValueListSchema,
  CustomValueOutputSchema,
  SaveCustomValueSchema,
  type SaveCustomValue
} from "@fina/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export function useCustomValues(groupId: string) {
  const client = useQueryClient()
  const key = ["custom-values", groupId]
  const query = useQuery({
    retry: false,
    refetchOnWindowFocus: true,
    queryKey: key,
    queryFn: async () =>
      CustomValueListSchema.parse(
        await customValuesControllerFindAll({ groupId })
      ),
    refetchInterval: 15000
  })
  const refresh = () => client.invalidateQueries({ queryKey: key })
  const save = useMutation({
    retry: false,
    mutationFn: async ({
      id,
      input
    }: {
      id?: string
      input: SaveCustomValue
    }) => {
      const requestBody = SaveCustomValueSchema.parse(input)
      return CustomValueOutputSchema.parse(
        await (id
          ? customValuesControllerUpdate({ groupId, id, requestBody })
          : customValuesControllerCreate({ groupId, requestBody }))
      )
    },
    onSuccess: refresh
  })
  const remove = useMutation({
    retry: false,
    mutationFn: (id: string) => customValuesControllerRemove({ groupId, id }),
    onSuccess: refresh
  })
  return { ...query, save, remove }
}
