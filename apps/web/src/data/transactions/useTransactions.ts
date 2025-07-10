import { useQuery } from "@tanstack/react-query";

import {
  QueryTransactionInputDto,
  QueryTransactionOutputDtoType,
} from "@fina/types";
import { fetchTransactions } from "./fetchTransactions";

export const useTransactions = (
  fetchTransactionsOptions: QueryTransactionInputDto
) => {
  return useQuery<QueryTransactionOutputDtoType>({
    enabled: !!fetchTransactionsOptions.groupId,
    queryKey: [
      "transactions",
      fetchTransactionsOptions.page,
      fetchTransactionsOptions.pageSize,
      fetchTransactionsOptions.groupId,
      fetchTransactionsOptions.startDate,
      fetchTransactionsOptions.endDate,
      fetchTransactionsOptions.categoryIdList,
      fetchTransactionsOptions.accountIdList,
      fetchTransactionsOptions.search,
    ],
    queryFn: () => fetchTransactions(fetchTransactionsOptions),
  });
};
