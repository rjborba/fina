import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

interface UseTransactionsOptions {
  page: number;
  pageSize: number;
}

export const useTransactions = ({ page, pageSize }: UseTransactionsOptions) => {
  return useQuery({
    queryKey: ["transactions", page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .eq("removed", false)
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
