import { useQuery } from "@tanstack/react-query";
import {
  fetchTransactions,
  FetchTransactionsOptions,
  FetchTransactionsResult,
} from "./fetchTransactions";

export const useTransactions = (
  fetchTransactionsOptions: FetchTransactionsOptions
) => {
  return useQuery<FetchTransactionsResult>({
    enabled: !!fetchTransactionsOptions.groupdId,
    queryKey: [
      "transactions",
      fetchTransactionsOptions.page,
      fetchTransactionsOptions.pageSize,
      fetchTransactionsOptions.groupdId,
      fetchTransactionsOptions.startDate,
      fetchTransactionsOptions.endDate,
      fetchTransactionsOptions.categoryIdList,
      fetchTransactionsOptions.accountIdList,
      fetchTransactionsOptions.search,
    ],
    queryFn: () => fetchTransactions(fetchTransactionsOptions),
  });
};
