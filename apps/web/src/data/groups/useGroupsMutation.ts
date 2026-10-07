import {
  CreateGroupInputDto,
  groupsControllerCreate,
  groupsControllerRemove,
  groupsControllerUpdateReviewSettings
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

  const updateReviewSettings = useMutation({
    retry: 0,
    mutationFn: ({
      id,
      creditCardReviewMonthOffset
    }: {
      id: string
      creditCardReviewMonthOffset: 0 | -1
    }) =>
      groupsControllerUpdateReviewSettings({
        id,
        requestBody: { creditCardReviewMonthOffset }
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
        queryClient.invalidateQueries({ queryKey: ["group"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-card-bills"] })
      ])
  })

  return { addGroup, removeGroup, updateReviewSettings }
}
