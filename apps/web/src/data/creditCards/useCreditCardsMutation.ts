import {
  creditCardsControllerCreate,
  creditCardsControllerRemove,
  creditCardsControllerUpdate
} from "@/api/generated"
import type { CreateCreditCardInput, UpdateCreditCardInput } from "@fina/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"

export function useCreditCardsMutation(groupId?: string) {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await Promise.all(
      [
        "credit-cards",
        "transactions",
        "credit-card-bills",
        "imports",
        "import-profiles"
      ].map((key) =>
        queryClient.invalidateQueries({
          queryKey: groupId ? [key, groupId] : [key]
        })
      )
    )
  }
  const addMutation = useMutation({
    mutationKey: ["credit-cards", groupId, "create"],
    retry: 0,
    mutationFn: (input: CreateCreditCardInput) =>
      creditCardsControllerCreate({ requestBody: input }),
    onSuccess: invalidate
  })
  const updateMutation = useMutation({
    mutationKey: ["credit-cards", groupId, "update"],
    retry: 0,
    mutationFn: ({ id, ...input }: UpdateCreditCardInput & { id: string }) =>
      creditCardsControllerUpdate({ id, requestBody: input }),
    onSuccess: invalidate
  })
  const archiveMutation = useMutation({
    mutationKey: ["credit-cards", groupId, "archive"],
    retry: 0,
    mutationFn: (id: string) => creditCardsControllerRemove({ id }),
    onSuccess: invalidate
  })
  return { addMutation, updateMutation, archiveMutation }
}
