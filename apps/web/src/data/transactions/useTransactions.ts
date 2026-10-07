import { useQuery } from "@tanstack/react-query"

import {
  QueryTransactionInputDto,
  QueryTransactionOutputDtoType
} from "@fina/types"
import { fetchTransactions } from "./fetchTransactions"

export const useTransactions = (
  fetchTransactionsOptions: QueryTransactionInputDto,
  enabled = true
) => {
  return useQuery<QueryTransactionOutputDtoType>({
    enabled: enabled && !!fetchTransactionsOptions.groupId,
    queryKey: [
      "transactions",
      fetchTransactionsOptions.page,
      fetchTransactionsOptions.pageSize,
      fetchTransactionsOptions.groupId,
      fetchTransactionsOptions.startDate,
      fetchTransactionsOptions.endDate,
      fetchTransactionsOptions.dateBasis,
      fetchTransactionsOptions.categoryIdList,
      fetchTransactionsOptions.accountIdList,
      fetchTransactionsOptions.accountType,
      fetchTransactionsOptions.search
    ],
    queryFn: () => fetchTransactions(fetchTransactionsOptions)
  })
}
