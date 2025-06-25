import { useQuery } from "@tanstack/react-query";
import {
  // fetchTransactions,
  FetchTransactionsOptions,
  FetchTransactionsResult,
} from "./fetchTransactions";
import { fetchTransactionsRest } from "./fetchTransactionsNest";

export const useTransactions = (
  fetchTransactionsOptions: FetchTransactionsOptions
) => {
  console.log("useTransactions...");
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
    queryFn: () => fetchTransactionsRest(fetchTransactionsOptions),
  });
};
