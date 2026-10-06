import {
  CreateInviteInputDto,
  invitesControllerAccept,
  invitesControllerCreate,
  invitesControllerRemove
} from "@/api/generated"
import { useMutation, useQueryClient } from "@tanstack/react-query"

export const useInvitesMutation = () => {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["invites"] }),
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    ])

  const addInvite = useMutation({
    mutationFn: (input: CreateInviteInputDto) =>
      invitesControllerCreate({ requestBody: input }),
    onSuccess: invalidate
  })
  const removeInvite = useMutation({
    mutationFn: (id: string) => invitesControllerRemove({ id }),
    onSuccess: invalidate
  })
  const acceptInvite = useMutation({
    mutationFn: (id: string) => invitesControllerAccept({ id }),
    onSuccess: invalidate
  })

  return { addInvite, removeInvite, acceptInvite }
}
