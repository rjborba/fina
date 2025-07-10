import { useQuery } from "@tanstack/react-query";
import { FinaAPIFetcher } from "../FinaAPIFetcher";
import { QueryBankaccountOutputDto } from "@fina/types";

type UseBankAccountsProps = {
  groupId?: string;
};

export const useBankAccounts = ({ groupId }: UseBankAccountsProps) => {
  return useQuery({
    enabled: groupId !== undefined,
    queryKey: ["bankaccounts", groupId],
    queryFn: async () => {
      const response = await FinaAPIFetcher.get<QueryBankaccountOutputDto>(
        `bankaccounts`,
        {
          groupId,
        }
      );

      return response.data;
    },
  });
};
