import {
  bankaccountsControllerCreate,
  bankaccountsControllerRemove,
  CreateBankaccountInputDto
} from "@/api/generated"
import { useQueryClient } from "@tanstack/react-query"

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

  return { addAccount, removeAccount }
}
