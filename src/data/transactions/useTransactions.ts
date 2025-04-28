import { useQuery } from '@tanstack/react-query';
import {
  fetchTransactions,
  type FetchTransactionsOptions,
  type FetchTransactionsResult,
} from './fetchTransactions';

export const useTransactions = (fetchTransactionsOptions: FetchTransactionsOptions) => {
  return useQuery<FetchTransactionsResult>({
    enabled: !!fetchTransactionsOptions.groupdId,
    queryKey: [
      'transactions',
      { groupId: fetchTransactionsOptions.groupdId },
      {
        page: fetchTransactionsOptions.page,
        pageSize: fetchTransactionsOptions.pageSize,
        startDate: fetchTransactionsOptions.startDate,
        endDate: fetchTransactionsOptions.endDate,
        categoryIdList: fetchTransactionsOptions.categoryIdList,
        accountIdList: fetchTransactionsOptions.accountIdList,
        search: fetchTransactionsOptions.search,
      },
    ],
    queryFn: () => fetchTransactions(fetchTransactionsOptions),
  });
};
