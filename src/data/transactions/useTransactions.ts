import { useQuery } from "@tanstack/react-query";
import { fetchTransactions } from "./fetchTransactions";

interface UseTransactionsProps {
  page: number;
  pageSize: number;
  groupdId: string;
  startDate?: string;
  endDate?: string;
  category_ids?: (number | null)[];
  account_ids?: number[];
}

export const useTransactions = ({
  page,
  pageSize,
  groupdId,
  startDate,
  endDate,
  category_ids,
  account_ids,
}: UseTransactionsProps) => {
  return useQuery({
    enabled: !!groupdId,
    queryKey: [
      "transactions",
      page,
      pageSize,
      groupdId,
      startDate,
      endDate,
      category_ids,
      account_ids,
    ],
    queryFn: () =>
      fetchTransactions({
        page,
        pageSize,
        groupdId,
        startDate,
        endDate,
        category_ids,
        account_ids,
      }),
  });
};
