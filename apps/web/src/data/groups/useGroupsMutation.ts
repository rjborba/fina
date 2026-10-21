import {
  CreateGroupInputDto,
  groupsControllerRename,
  groupsControllerCreate,
  groupsControllerRemove
} from "@/api/generated"
import { useMutation, useQueryClient } from "@tanstack/react-query"

export const useGroupsMutation = () => {
  const queryClient = useQueryClient()

  const addGroup = useMutation({
    mutationFn: (input: CreateGroupInputDto) =>
      groupsControllerCreate({ requestBody: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] })
  })

  const removeGroup = useMutation({
    mutationFn: ({ id, confirmName }: { id: string; confirmName: string }) =>
      groupsControllerRemove({ id, requestBody: { confirmName } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] })
  })

  const renameGroup = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      groupsControllerRename({ id, requestBody: { name } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] })
  })

  return { addGroup, removeGroup, renameGroup }
}
