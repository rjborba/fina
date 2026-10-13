import {
  bankaccountsControllerCreate,
  bankaccountsControllerRemove,
  bankaccountsControllerUpdateInstitution,
  CreateBankaccountInputDto
} from "@/api/generated"
import type { FinancialInstitutionId } from "@fina/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"

export const useAccountsMutation = () => {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["bankaccounts"] })

  const addAccount = async (input: CreateBankaccountInputDto) => {
    await bankaccountsControllerCreate({ requestBody: input })
    await invalidate()
  }

  const removeAccount = async (id: string) => {
    await bankaccountsControllerRemove({ id })
    await invalidate()
  }

  const institutionMutation = useMutation({
    mutationKey: ["bankaccounts", "institution"],
    retry: 0,
    mutationFn: ({
      id,
      institutionId
    }: {
      id: string
      institutionId: FinancialInstitutionId | null
    }) =>
      bankaccountsControllerUpdateInstitution({
        id,
        requestBody: { institutionId }
      }),
    onSuccess: async () => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-card-bills"] }),
        queryClient.invalidateQueries({ queryKey: ["imports"] }),
        queryClient.invalidateQueries({ queryKey: ["import-profiles"] })
      ])
    }
  })

  return {
    addAccount,
    removeAccount,
    updateInstitution: institutionMutation.mutateAsync
  }
}
