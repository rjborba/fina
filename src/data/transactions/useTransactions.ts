import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

interface UseTransactionsOptions {
  page: number;
  pageSize: number;
  groupdId?: string;
}

export const useTransactions = ({
  page,
  pageSize,
  groupdId,
}: UseTransactionsOptions) => {
  return useQuery({
    enabled:
      page !== undefined && pageSize !== undefined && groupdId !== undefined,
    queryKey: ["transactions", page, pageSize, groupdId],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .eq("removed", false)
        .eq("group_id", groupdId!)
        .order("date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);

      if (error) {
        throw error;
      }

      return {
        data,
        totalCount: count || 0,
      };
    },
  });
};
