import { useQueryClient } from "@tanstack/react-query";
import { FinaAPIFetcher } from "../FinaAPIFetcher";
import {
  CreateBankaccountInputDto,
  CreateBankaccountOutputDto,
  RemoveBankaccountInputDto,
} from "@fina/types";

export const useAccountsMutation = () => {
  const queryClient = useQueryClient();

  const addAccount = async (account: CreateBankaccountInputDto) => {
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
    console.log(account);
    await FinaAPIFetcher.post<CreateBankaccountOutputDto>(
      "bankaccounts",
      account
    );
    queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
  };

  const removeAccount = async (id: string) => {
    await FinaAPIFetcher.delete<RemoveBankaccountInputDto>(
      `bankaccounts/${id}`
    );
    queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
  };

  return { addAccount, removeAccount };
};
