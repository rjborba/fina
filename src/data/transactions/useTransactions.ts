import { useQuery } from "@tanstack/react-query";
import {
  fetchTransactions,
  FetchTransactionsOptions,
} from "./fetchTransactions";

export const useTransactions = (options: FetchTransactionsOptions) => {
  return useQuery({
    enabled:
      options.page !== undefined &&
      options.pageSize !== undefined &&
      options.groupdId !== undefined,
    queryKey: [
      "transactions",
      options.page,
      options.pageSize,
      options.groupdId,
      options.startDate,
      options.endDate,
      options.category_id,
    ],
    queryFn: () => fetchTransactions(options),
  });
};
